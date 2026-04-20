import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';
import { TicketCommentWriteRepository } from '../repositories/ticket-comment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { assertTicketCommentAccess } from '../ticket-comment-access';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';

export type DeleteTicketCommentCommand = {
  actorRole: UserRole;
  actorUserId: string;
  commentId: string;
  ticketId: string;
};

@Injectable()
export class DeleteTicketCommentUseCase {
  constructor(
    @Inject(TicketCommentReadRepository)
    private readonly ticketCommentReadRepository: TicketCommentReadRepository,
    @Inject(TicketCommentWriteRepository)
    private readonly ticketCommentWriteRepository: TicketCommentWriteRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    private readonly ticketAuditService: TicketAuditService,
  ) {}

  async execute(command: DeleteTicketCommentCommand): Promise<void> {
    const normalizedTicketId = command.ticketId.trim();
    const normalizedCommentId = command.commentId.trim();
    const normalizedActorUserId = command.actorUserId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedCommentId) {
      throw new BadRequestException('commentId is required.');
    }

    if (!normalizedActorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketCommentAccess({
      ticket,
      userId: normalizedActorUserId,
      userRole: command.actorRole,
    });

    try {
      assertTicketCanBeModifiedByRole(
        ticket.ticket.status,
        ticket.ticket.archivedAt,
        command.actorRole,
      );
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    const comment = await this.ticketCommentReadRepository.getTicketCommentById(
      normalizedTicketId,
      normalizedCommentId,
    );

    if (!comment) {
      throw new NotFoundException(
        `Ticket comment ${normalizedCommentId} was not found.`,
      );
    }

    if (
      command.actorRole === UserRole.DEMANDEUR &&
      comment.authorUserId !== normalizedActorUserId
    ) {
      throw new ForbiddenException(
        'Demandeur users can only delete their own comments.',
      );
    }

    await this.ticketCommentWriteRepository.deleteTicketComment(
      normalizedTicketId,
      normalizedCommentId,
    );

    await this.ticketAuditService.write({
      actorUserId: normalizedActorUserId,
      eventType: TicketHistoryEventType.COMMENT_DELETED,
      payload: {
        authorUserId: comment.authorUserId,
        commentId: comment.id,
        isInternal: comment.isInternal,
      },
      ticketId: normalizedTicketId,
    });
  }
}
