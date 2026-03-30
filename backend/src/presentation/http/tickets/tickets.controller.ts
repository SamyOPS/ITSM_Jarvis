import { Controller, Get } from '@nestjs/common';
import { ListTicketsUseCase } from '../../../application/ticketing/use-cases/list-tickets.use-case';
import { type TicketSummary } from '../../../domain/ticketing/ticket-summary.entity';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly listTicketsUseCase: ListTicketsUseCase) {}

  @Get()
  listTickets(): Promise<readonly TicketSummary[]> {
    return this.listTicketsUseCase.execute();
  }
}
