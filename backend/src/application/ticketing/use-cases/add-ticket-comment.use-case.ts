import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketCommentWriteRepository } from '../repositories/ticket-comment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { assertTicketCommentAccess } from '../ticket-comment-access';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';

export type AddTicketCommentCommand = {
  authorRole: UserRole;
  authorUserId: string;
  body: string;
  isInternal?: boolean | null;
  ticketId: string;
};

@Injectable()
export class AddTicketCommentUseCase {
  constructor(
    @Inject(TicketCommentWriteRepository)
    private readonly ticketCommentWriteRepository: TicketCommentWriteRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    private readonly ticketAuditService: TicketAuditService,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
  ) {}

  async execute(command: AddTicketCommentCommand): Promise<TicketComment> {
    const normalizedTicketId = command.ticketId.trim();
    const normalizedAuthorUserId = command.authorUserId.trim();
    const normalizedBody = command.body.trim();
    const isInternal = command.isInternal ?? false;

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedAuthorUserId) {
      throw new BadRequestException('authorUserId is required.');
    }

    if (!normalizedBody) {
      throw new BadRequestException('body is required.');
    }

    if (command.authorRole === UserRole.DEMANDEUR && isInternal) {
      throw new ForbiddenException(
        'Demandeur users cannot create internal comments.',
      );
    }

    const [ticket, userProfile] = await Promise.all([
      this.ticketReadRepository.getTicketById(normalizedTicketId),
      command.authorRole === UserRole.AGENT
        ? this.userAssignmentProfileRepository?.getById(
            normalizedAuthorUserId,
          ) ?? Promise.resolve(null)
        : Promise.resolve(null),
    ]);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketCommentAccess({
      ticket,
      userId: normalizedAuthorUserId,
      userProfile,
      userRole: command.authorRole,
    });

    try {
      assertTicketCanBeModifiedByRole(
        ticket.ticket.status,
        ticket.ticket.archivedAt,
        command.authorRole,
      );
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    const comment = await this.ticketCommentWriteRepository.addTicketComment({
      authorUserId: normalizedAuthorUserId,
      body: normalizedBody,
      isInternal,
      ticketId: normalizedTicketId,
    });

    await this.ticketAuditService.write({
      actorUserId: normalizedAuthorUserId,
      eventType: TicketHistoryEventType.COMMENT_ADDED,
      payload: {
        commentId: comment.id,
        isInternal: comment.isInternal,
      },
      ticketId: normalizedTicketId,
    });

    return comment;
  }
}
