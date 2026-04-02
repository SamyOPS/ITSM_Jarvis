import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketAttachmentWriteRepository } from '../repositories/ticket-attachment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { assertTicketAttachmentAccess } from '../ticket-attachment-access';

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

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketAttachmentAccess({
      ticket,
      userId: normalizedUploaderUserId,
      userRole: command.uploaderRole,
    });

    return this.ticketAttachmentWriteRepository.addTicketAttachment({
      bucketId: normalizedBucketId,
      fileName: normalizedFileName,
      mimeType: normalizedMimeType,
      sizeBytes: command.sizeBytes,
      storagePath: normalizedStoragePath,
      ticketId: normalizedTicketId,
      uploadedByUserId: normalizedUploaderUserId,
    });
  }
}
