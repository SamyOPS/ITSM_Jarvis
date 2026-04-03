import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { calculateSlaTargets } from '../sla-targets';

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
    const actorUserId = command.actorUserId.trim();
    const ticketId = command.ticketId.trim();
    const priorityId = command.priorityId.trim();

    if (!actorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

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

    await this.ticketAuditService.write({
      actorUserId,
      eventType: TicketHistoryEventType.PRIORITY_CHANGED,
      payload: {
        fromPriorityId: existingTicket.ticket.priorityId,
        fromResolutionDueAt: existingTicket.ticket.resolutionDueAt,
        fromResponseDueAt: existingTicket.ticket.responseDueAt,
        toPriorityId: updatedTicket.ticket.priorityId,
        toResolutionDueAt: updatedTicket.ticket.resolutionDueAt,
        toResponseDueAt: updatedTicket.ticket.responseDueAt,
      },
      ticketId,
    });

    return updatedTicket;
  }
}
