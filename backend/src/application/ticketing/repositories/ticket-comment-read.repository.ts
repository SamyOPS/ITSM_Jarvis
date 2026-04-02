import { TicketComment } from '../../../domain/ticketing/ticket-comment';

export type ListTicketCommentsFilters = {
  includeInternal: boolean;
  ticketId: string;
};

export abstract class TicketCommentReadRepository {
  abstract listTicketComments(
    filters: ListTicketCommentsFilters,
  ): Promise<TicketComment[]>;
}
