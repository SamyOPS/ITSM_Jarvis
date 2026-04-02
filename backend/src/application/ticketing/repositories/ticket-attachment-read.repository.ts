import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';

export type ListTicketAttachmentsFilters = {
  ticketId: string;
};

export abstract class TicketAttachmentReadRepository {
  abstract listTicketAttachments(
    filters: ListTicketAttachmentsFilters,
  ): Promise<TicketAttachment[]>;
}
