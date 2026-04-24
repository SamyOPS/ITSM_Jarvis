import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import {
  TicketWriteRepository,
  type UpdateTicketRecord,
} from '../repositories/ticket-write.repository';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';

export type UpdateTicketCommand = {
  actorRole: UserRole;
  actorUserId: string;
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  requestedForUserId?: string | null;
  serviceId?: string | null;
  ticketId: string;
  title: string;
};

@Injectable()
export class UpdateTicketUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
  ) {}

  async execute(command: UpdateTicketCommand): Promise<TicketDetail> {
    const ticketId = command.ticketId.trim();
    const actorUserId = command.actorUserId.trim();
    const title = command.title.trim();
    const description = command.description.trim();
    const categoryId = command.categoryId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!actorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    if (command.actorRole !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can update tickets.');
    }

    if (!title) {
      throw new BadRequestException('title is required.');
    }

    if (!description) {
      throw new BadRequestException('description is required.');
    }

    if (!categoryId) {
      throw new BadRequestException('categoryId is required.');
    }

    const existingTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!existingTicket) {
      throw new NotFoundException(`Ticket ${ticketId} was not found.`);
    }

    if (existingTicket.ticket.archivedAt) {
      throw new BadRequestException(
        'Archived tickets cannot be updated anymore.',
      );
    }

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

    const record: UpdateTicketRecord = {
      categoryId,
      channelId: normalizeOptionalId(command.channelId),
      ciId: normalizeOptionalId(command.ciId),
      description,
      requestedForUserId: normalizeOptionalId(command.requestedForUserId),
      serviceId: normalizeOptionalId(command.serviceId),
      title,
    };

    await this.ticketWriteRepository.updateTicket(ticketId, record);

    const updatedTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!updatedTicket) {
      throw new BadRequestException(
        `Ticket ${ticketId} could not be reloaded after update.`,
      );
    }

    return updatedTicket;
  }
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
