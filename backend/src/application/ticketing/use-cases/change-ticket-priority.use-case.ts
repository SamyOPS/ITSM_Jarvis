import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { calculateSlaTargets } from '../sla-targets';
import { TicketAuditService } from '../ticket-audit.service';

export type ChangeTicketPriorityCommand = {
  actorUserId: string;
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
    private readonly ticketAuditService: TicketAuditService,
  ) {}

  async execute(command: ChangeTicketPriorityCommand): Promise<TicketDetail> {
    const ticketId = command.ticketId.trim();
    const priorityId = command.priorityId.trim();
    const actorUserId = command.actorUserId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!priorityId) {
      throw new BadRequestException('priorityId is required.');
    }

    if (!actorUserId) {
      throw new BadRequestException('actorUserId is required.');
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

    await this.ticketAuditService.write({
      actorUserId,
      eventType: TicketHistoryEventType.PRIORITY_CHANGED,
      payload: {
        fromPriorityId: existingTicket.ticket.priorityId,
        toPriorityId: priorityId,
        fromResponseDueAt: existingTicket.ticket.responseDueAt,
        toResponseDueAt: updatedTicket.ticket.responseDueAt,
        fromResolutionDueAt: existingTicket.ticket.resolutionDueAt,
        toResolutionDueAt: updatedTicket.ticket.resolutionDueAt,
      },
      ticketId,
    });

    return updatedTicket;
  }
}
