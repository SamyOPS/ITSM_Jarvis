import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketAttachmentWriteRepository } from '../repositories/ticket-attachment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { resolveAccessibleTicket } from '../ticket-access-resolver';
import { TicketAuditService } from '../ticket-audit.service';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';

export type AddTicketAttachmentCommand = {
  bucketId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  storagePath: string;
  ticketId: string;
  uploaderRole: UserRole;
  uploaderUserId: string;
};

@Injectable()
export class AddTicketAttachmentUseCase {
  constructor(
    @Inject(TicketAttachmentWriteRepository)
    private readonly ticketAttachmentWriteRepository: TicketAttachmentWriteRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    private readonly ticketAuditService: TicketAuditService,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
  ) {}

  async execute(
    command: AddTicketAttachmentCommand,
  ): Promise<TicketAttachment> {
    const normalizedTicketId = command.ticketId.trim();
    const normalizedUploaderUserId = command.uploaderUserId.trim();
    const normalizedBucketId = command.bucketId.trim();
    const normalizedStoragePath = command.storagePath.trim();
    const normalizedFileName = command.fileName.trim();
    const normalizedMimeType = command.mimeType?.trim() || null;

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedUploaderUserId) {
      throw new BadRequestException('uploaderUserId is required.');
    }

    if (!normalizedBucketId) {
      throw new BadRequestException('bucketId is required.');
    }

    if (!normalizedStoragePath) {
      throw new BadRequestException('storagePath is required.');
    }

    if (!normalizedFileName) {
      throw new BadRequestException('fileName is required.');
    }

    if (!Number.isInteger(command.sizeBytes) || command.sizeBytes < 0) {
      throw new BadRequestException(
        'sizeBytes must be a non-negative integer.',
      );
    }

    const ticket = await resolveAccessibleTicket({
      scope: 'attachment',
      ticketId: normalizedTicketId,
      ticketReadRepository: this.ticketReadRepository,
      userAssignmentProfileRepository: this.userAssignmentProfileRepository,
      userId: normalizedUploaderUserId,
      userRole: command.uploaderRole,
    });

    try {
      assertTicketCanBeModifiedByRole(
        ticket.ticket.status,
        ticket.ticket.archivedAt,
        command.uploaderRole,
      );
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    const attachment =
      await this.ticketAttachmentWriteRepository.addTicketAttachment({
        bucketId: normalizedBucketId,
        fileName: normalizedFileName,
        mimeType: normalizedMimeType,
        sizeBytes: command.sizeBytes,
        storagePath: normalizedStoragePath,
        ticketId: normalizedTicketId,
        uploadedByUserId: normalizedUploaderUserId,
      });

    await this.ticketAuditService.write({
      actorUserId: normalizedUploaderUserId,
      eventType: TicketHistoryEventType.ATTACHMENT_ADDED,
      payload: {
        attachmentId: attachment.id,
        bucketId: attachment.bucketId,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        storagePath: attachment.storagePath,
      },
      ticketId: normalizedTicketId,
    });

    return attachment;
  }
}
