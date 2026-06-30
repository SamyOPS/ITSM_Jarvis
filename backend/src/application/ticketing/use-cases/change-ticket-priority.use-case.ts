import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { resolveAccessibleTicket } from '../ticket-access-resolver';
import { TicketAuditService } from '../ticket-audit.service';
import { calculateSlaTargets } from '../sla-targets';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';

export type ChangeTicketPriorityCommand = {
  actorRole?: UserRole;
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
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
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

    const existingTicket = await resolveAccessibleTicket({
      scope: 'detail',
      ticketId,
      ticketReadRepository: this.ticketReadRepository,
      userAssignmentProfileRepository: this.userAssignmentProfileRepository,
      userId: actorUserId,
      userRole: command.actorRole ?? UserRole.AGENT,
    });

    try {
      assertTicketCanBeModifiedByRole(
        existingTicket.ticket.status,
        existingTicket.ticket.archivedAt,
        command.actorRole,
      );
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
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
        fromResponseDueAt: existingTicket.ticket.responseDueAt,
        fromResolutionDueAt: existingTicket.ticket.resolutionDueAt,
        toPriorityId: updatedTicket.ticket.priorityId,
        toResponseDueAt: updatedTicket.ticket.responseDueAt,
        toResolutionDueAt: updatedTicket.ticket.resolutionDueAt,
      },
      ticketId,
    });

    return updatedTicket;
  }
}
