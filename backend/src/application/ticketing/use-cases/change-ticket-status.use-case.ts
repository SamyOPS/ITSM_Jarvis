import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { assertAllowedTicketStatusTransition } from '../ticketing-rules';

export type ChangeTicketStatusCommand = {
  status: TicketStatus;
  ticketId: string;
};

@Injectable()
export class ChangeTicketStatusUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
  ) {}

  async execute(command: ChangeTicketStatusCommand): Promise<TicketDetail> {
    const ticketId = command.ticketId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    const existingTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!existingTicket) {
      throw new BadRequestException(`Ticket ${ticketId} does not exist.`);
    }

    try {
      assertAllowedTicketStatusTransition(
        existingTicket.ticket.status,
        command.status,
      );
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    await this.ticketWriteRepository.updateStatus(ticketId, command.status);

    const updatedTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!updatedTicket) {
      throw new BadRequestException(
        `Ticket ${ticketId} could not be reloaded after status update.`,
      );
    }

    return updatedTicket;
  }
}
