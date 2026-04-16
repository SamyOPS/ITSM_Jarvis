import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';

export type ListTicketHistoryFilters = {
  ticketIds: string[];
};

export abstract class TicketHistoryReadRepository {
  abstract listTicketHistoryEntries(
    filters: ListTicketHistoryFilters,
  ): Promise<TicketHistoryEntry[]>;
}
