import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { calculateSlaTargets } from '../sla-targets';

export type ChangeTicketPriorityCommand = {
  priorityId: string;
  ticketId: string;
};

@Injectable()
export class ChangeTicketPriorityUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityRepository: ReferentialPriorityReadRepository,
  ) {}

  async execute(command: ChangeTicketPriorityCommand): Promise<TicketDetail> {
    const ticketId = command.ticketId.trim();
    const priorityId = command.priorityId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!priorityId) {
      throw new BadRequestException('priorityId is required.');
    }

    const existingTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!existingTicket) {
      throw new BadRequestException(`Ticket ${ticketId} does not exist.`);
    }

    const priorities = await this.priorityRepository.listPriorities();
    const resolvedPriority = priorities.find(
      (priority) => priority.id === priorityId,
    );

    if (!resolvedPriority) {
      throw new BadRequestException(
        `Priority ${priorityId} is not configured in referentials.`,
      );
    }

    const slaTargets = calculateSlaTargets(resolvedPriority);

    await this.ticketWriteRepository.updatePriority(ticketId, {
      priorityId,
      resolutionDueAt: slaTargets.resolutionDueAt,
      responseDueAt: slaTargets.responseDueAt,
    });

    const updatedTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!updatedTicket) {
      throw new BadRequestException(
        `Ticket ${ticketId} could not be reloaded after priority update.`,
      );
    }

    return updatedTicket;
  }
}
