import { Injectable } from '@nestjs/common';
import { type TicketRepository } from '../../../domain/ticketing/ticket.repository';
import { type TicketSummary } from '../../../domain/ticketing/ticket-summary.entity';
import { TICKET_SEED } from './ticket.seed';

@Injectable()
export class InMemoryTicketRepository implements TicketRepository {
  list(): Promise<readonly TicketSummary[]> {
    return Promise.resolve(TICKET_SEED);
  }
}
