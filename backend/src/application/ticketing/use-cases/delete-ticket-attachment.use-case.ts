import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketAttachmentReadRepository } from '../repositories/ticket-attachment-read.repository';
import { TicketAttachmentWriteRepository } from '../repositories/ticket-attachment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { assertTicketAttachmentAccess } from '../ticket-attachment-access';
import { TicketAuditService } from '../ticket-audit.service';

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

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketAttachmentAccess({
      ticket,
      userId: normalizedActorUserId,
      userRole: command.actorRole,
    });

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
