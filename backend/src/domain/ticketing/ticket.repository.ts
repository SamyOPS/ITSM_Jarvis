import { type TicketSummary } from './ticket-summary.entity';

export interface TicketRepository {
  list(): Promise<readonly TicketSummary[]>;
}
