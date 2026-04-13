import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';

export type CreateTicketAttachmentRecord = {
  bucketId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  storagePath: string;
  ticketId: string;
  uploadedByUserId: string;
};

export abstract class TicketAttachmentWriteRepository {
  abstract addTicketAttachment(
    record: CreateTicketAttachmentRecord,
  ): Promise<TicketAttachment>;

  abstract deleteTicketAttachment(
    ticketId: string,
    attachmentId: string,
  ): Promise<void>;
}
