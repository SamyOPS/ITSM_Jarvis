import { Inject, Injectable } from '@nestjs/common';
import { TICKET_REPOSITORY } from '../../../domain/ticketing/ticket-repository.token';
import { type TicketRepository } from '../../../domain/ticketing/ticket.repository';
import { type TicketSummary } from '../../../domain/ticketing/ticket-summary.entity';

@Injectable()
export class ListTicketsUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  execute(): Promise<readonly TicketSummary[]> {
    return this.ticketRepository.list();
  }
}
