import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';

export type ListTicketAttachmentsFilters = {
  ticketId: string;
};

export abstract class TicketAttachmentReadRepository {
  abstract getTicketAttachmentById(
    ticketId: string,
    attachmentId: string,
  ): Promise<TicketAttachment | null>;

  abstract listTicketAttachments(
    filters: ListTicketAttachmentsFilters,
  ): Promise<TicketAttachment[]>;
}
