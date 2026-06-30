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
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketAttachmentReadRepository } from '../repositories/ticket-attachment-read.repository';
import { TicketAttachmentWriteRepository } from '../repositories/ticket-attachment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { assertTicketAttachmentAccess } from '../ticket-attachment-access';
import { TicketAuditService } from '../ticket-audit.service';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';

export type DeleteTicketAttachmentCommand = {
  actorRole: UserRole;
  actorUserId: string;
  attachmentId: string;
  ticketId: string;
};

@Injectable()
export class DeleteTicketAttachmentUseCase {
  constructor(
    @Inject(TicketAttachmentReadRepository)
    private readonly ticketAttachmentReadRepository: TicketAttachmentReadRepository,
    @Inject(TicketAttachmentWriteRepository)
    private readonly ticketAttachmentWriteRepository: TicketAttachmentWriteRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    private readonly ticketAuditService: TicketAuditService,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
  ) {}

  async execute(command: DeleteTicketAttachmentCommand): Promise<void> {
    const normalizedTicketId = command.ticketId.trim();
    const normalizedAttachmentId = command.attachmentId.trim();
    const normalizedActorUserId = command.actorUserId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedAttachmentId) {
      throw new BadRequestException('attachmentId is required.');
    }

    if (!normalizedActorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    const [ticket, userProfile] = await Promise.all([
      this.ticketReadRepository.getTicketById(normalizedTicketId),
      command.actorRole === UserRole.AGENT
        ? (this.userAssignmentProfileRepository?.getById(
            normalizedActorUserId,
          ) ?? Promise.resolve(null))
        : Promise.resolve(null),
    ]);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketAttachmentAccess({
      ticket,
      userId: normalizedActorUserId,
      userProfile,
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

    const attachment =
      await this.ticketAttachmentReadRepository.getTicketAttachmentById(
        normalizedTicketId,
        normalizedAttachmentId,
      );

    if (!attachment) {
      throw new NotFoundException(
        `Ticket attachment ${normalizedAttachmentId} was not found.`,
      );
    }

    if (
      command.actorRole === UserRole.DEMANDEUR &&
      attachment.uploadedByUserId !== normalizedActorUserId
    ) {
      throw new ForbiddenException(
        'Demandeur users can only delete their own attachments.',
      );
    }

    await this.ticketAttachmentWriteRepository.deleteTicketAttachment(
      normalizedTicketId,
      normalizedAttachmentId,
    );

    await this.ticketAuditService.write({
      actorUserId: normalizedActorUserId,
      eventType: TicketHistoryEventType.ATTACHMENT_DELETED,
      payload: {
        attachmentId: attachment.id,
        bucketId: attachment.bucketId,
        fileName: attachment.fileName,
        storagePath: attachment.storagePath,
      },
      ticketId: normalizedTicketId,
    });
  }
}
