import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { assertValidAssignmentPolicy } from '../ticketing-rules';

export type AssignTicketCommand = {
  actorUserId: string;
  assignedToUserId?: string | null;
  assignmentGroupId?: string | null;
  ticketId: string;
};

@Injectable()
export class AssignTicketUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository: UserAssignmentProfileRepository,
    private readonly ticketAuditService: TicketAuditService,
  ) {}

  async execute(command: AssignTicketCommand): Promise<TicketDetail> {
    const ticketId = command.ticketId.trim();
    const actorUserId = command.actorUserId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!actorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    const existingTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!existingTicket) {
      throw new BadRequestException(`Ticket ${ticketId} does not exist.`);
    }

    const assignedToUserId = normalizeOptionalId(command.assignedToUserId);
    const assignmentGroupId = normalizeOptionalId(command.assignmentGroupId);
    const assignedUser = assignedToUserId
      ? await this.userAssignmentProfileRepository.getById(assignedToUserId)
      : null;

    try {
      assertValidAssignmentPolicy({
        assignedToUserId,
        assignmentGroupId,
        user: assignedUser,
      });
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    await this.ticketWriteRepository.updateAssignment(ticketId, {
      assignedToUserId,
      assignmentGroupId,
    });

    const updatedTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!updatedTicket) {
      throw new BadRequestException(
        `Ticket ${ticketId} could not be reloaded after assignment.`,
      );
    }

    await this.ticketAuditService.write({
      actorUserId,
      eventType:
        assignedToUserId || assignmentGroupId
          ? TicketHistoryEventType.ASSIGNED
          : TicketHistoryEventType.UNASSIGNED,
      payload: {
        fromAssignedToUserId: existingTicket.ticket.assignedToUserId,
        fromAssignmentGroupId: existingTicket.ticket.assignmentGroupId,
        toAssignedToUserId: assignedToUserId,
        toAssignmentGroupId: assignmentGroupId,
      },
      ticketId,
    });

    return updatedTicket;
  }
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
