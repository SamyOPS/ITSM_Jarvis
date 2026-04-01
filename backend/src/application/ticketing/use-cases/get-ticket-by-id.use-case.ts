import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketReadRepository } from '../repositories/ticket-read.repository';

@Injectable()
export class GetTicketByIdUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async execute(ticketId: string): Promise<TicketDetail> {
    const normalizedTicketId = ticketId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    return ticket;
  }
}
