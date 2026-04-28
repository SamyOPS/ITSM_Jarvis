import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export type SearchTicketsFilters = {
  assignedToUserId?: string | null;
  assignmentGroupId?: string | null;
  categoryId?: string | null;
  channelId?: string | null;
  createdByUserId?: string | null;
  priorityId?: string | null;
  q?: string | null;
  requestedForUserId?: string | null;
  status?: TicketStatus | null;
  type?: TicketType | null;
};

export abstract class TicketReadRepository {
  abstract getTicketById(ticketId: string): Promise<TicketDetail | null>;

  abstract searchTickets(
    filters: SearchTicketsFilters,
  ): Promise<TicketSummary[]>;
}
