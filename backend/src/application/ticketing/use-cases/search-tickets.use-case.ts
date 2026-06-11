import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserAssignmentProfile } from '../../../domain/auth/user-assignment-profile';
import { UserRole } from '../../../domain/auth/user-role';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
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
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository: UserAssignmentProfileRepository,
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
      const [tickets, profile] = await Promise.all([
        this.ticketReadRepository.searchTickets(normalizedFilters),
        this.userAssignmentProfileRepository.getById(requesterUserId),
      ]);

      return withoutClosedOrArchivedTickets(tickets).filter((ticket) =>
        isTicketVisibleToAgent(ticket, requesterUserId, profile),
      );
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

function isTicketVisibleToAgent(
  ticket: TicketSummary,
  agentUserId: string,
  profile: UserAssignmentProfile | null,
): boolean {
  if (ticket.assignmentGroupId) {
    const groupIds = new Set([
      ...(profile?.groupIds ?? []),
      ...(profile?.groupId ? [profile.groupId] : []),
    ]);

    return groupIds.has(ticket.assignmentGroupId);
  }

  if (ticket.assignedToUserId) {
    return ticket.assignedToUserId === agentUserId;
  }

  return true;
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

  return normalized;
}
