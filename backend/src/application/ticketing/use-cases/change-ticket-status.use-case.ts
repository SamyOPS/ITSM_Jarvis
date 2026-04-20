import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import {
  assertAllowedTicketStatusTransition,
  assertTicketCanBeModifiedByRole,
} from '../ticketing-rules';

export type ChangeTicketStatusCommand = {
  actorRole?: UserRole;
  actorUserId: string;
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
    private readonly ticketAuditService: TicketAuditService,
  ) {}

  async execute(command: ChangeTicketStatusCommand): Promise<TicketDetail> {
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

    try {
      assertTicketCanBeModifiedByRole(
        existingTicket.ticket.status,
        existingTicket.ticket.archivedAt,
        command.actorRole,
      );
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

    await this.ticketAuditService.write({
      actorUserId,
      eventType: TicketHistoryEventType.STATUS_CHANGED,
      payload: {
        fromStatus: existingTicket.ticket.status,
        toStatus: command.status,
      },
      ticketId,
    });

    return updatedTicket;
  }
}
