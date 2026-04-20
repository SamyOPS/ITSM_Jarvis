import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import {
  SearchTicketsFilters,
  TicketReadRepository,
} from '../repositories/ticket-read.repository';

export type SearchTicketsQuery = SearchTicketsFilters & {
  includeArchived?: boolean;
  requesterUserId: string;
  requesterUserRole: UserRole;
};

@Injectable()
export class SearchTicketsUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async execute(query: SearchTicketsQuery): Promise<TicketSummary[]> {
    const normalizedFilters = {
      assignedToUserId: normalizeOptionalId(query.assignedToUserId),
      assignmentGroupId: normalizeOptionalId(query.assignmentGroupId),
      categoryId: normalizeOptionalId(query.categoryId),
      channelId: normalizeOptionalId(query.channelId),
      createdByUserId: normalizeOptionalId(query.createdByUserId),
      priorityId: normalizeOptionalId(query.priorityId),
      q: normalizeOptionalText(query.q),
      requestedForUserId: normalizeOptionalId(query.requestedForUserId),
      serviceId: normalizeOptionalId(query.serviceId),
      status: query.status ?? null,
      type: query.type ?? null,
    };
    const requesterUserId = normalizeRequiredId(query.requesterUserId);

    if (query.requesterUserRole === UserRole.ADMIN) {
      const tickets =
        await this.ticketReadRepository.searchTickets(normalizedFilters);

      return query.includeArchived ? tickets : withoutArchivedTickets(tickets);
    }

    if (query.requesterUserRole === UserRole.AGENT) {
      const tickets =
        await this.ticketReadRepository.searchTickets(normalizedFilters);

      return withoutClosedOrArchivedTickets(tickets);
    }

    const [createdTickets, requestedTickets] = await Promise.all([
      this.ticketReadRepository.searchTickets({
        ...normalizedFilters,
        createdByUserId: requesterUserId,
        requestedForUserId: null,
      }),
      this.ticketReadRepository.searchTickets({
        ...normalizedFilters,
        createdByUserId: null,
        requestedForUserId: requesterUserId,
      }),
    ]);

    const tickets = [
      ...new Map(
        [...createdTickets, ...requestedTickets].map((ticket) => [
          ticket.id,
          ticket,
        ]),
      ).values(),
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return withoutArchivedTickets(tickets);
  }
}

function withoutArchivedTickets(tickets: TicketSummary[]): TicketSummary[] {
  return tickets.filter((ticket) => !ticket.archivedAt);
}

function withoutClosedOrArchivedTickets(
  tickets: TicketSummary[],
): TicketSummary[] {
  return tickets.filter(
    (ticket) => !ticket.archivedAt && ticket.status !== TicketStatus.CLOSED,
  );
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeRequiredId(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('requesterUserId is required.');
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length < 2) {
    throw new BadRequestException('q must contain at least 2 characters.');
  }

  return normalized;
}
