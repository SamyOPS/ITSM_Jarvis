import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';
import { SlaIndicator } from '../../../domain/ticketing/sla-indicator';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { AdminUserReadRepository } from '../../auth/repositories/admin-user-read.repository';
import { TicketHistoryReadRepository } from '../../ticketing/repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../../ticketing/repositories/ticket-read.repository';

export type AgentPerformanceReportQuery = {
  assignedToUserId?: string | null;
  categoryId?: string | null;
  from?: string | null;
  priorityId?: string | null;
  status?: TicketStatus | null;
  to?: string | null;
  type?: TicketType | null;
};

export type AgentPerformanceReportItem = {
  agentId: string;
  agentName: string;
  averageResolutionTimeMinutes: number | null;
  ticketsAssigned: number;
  ticketsOverdue: number;
  ticketsResolved: number;
};

export type AgentPerformanceReport = {
  filters: {
    assignedToUserId: string | null;
    categoryId: string | null;
    from: string | null;
    priorityId: string | null;
    status: TicketStatus | null;
    to: string | null;
    type: TicketType | null;
  };
  agents: AgentPerformanceReportItem[];
};

@Injectable()
export class GetAgentPerformanceReportUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketHistoryReadRepository)
    private readonly ticketHistoryReadRepository: TicketHistoryReadRepository,
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
  ) {}

  async execute(
    query: AgentPerformanceReportQuery = {},
  ): Promise<AgentPerformanceReport> {
    const filters = normalizeFilters(query);
    const [tickets, users] = await Promise.all([
      this.ticketReadRepository.searchTickets({
        assignedToUserId: filters.assignedToUserId,
        assignmentGroupId: null,
        categoryId: filters.categoryId,
        channelId: null,
        createdByUserId: null,
        priorityId: filters.priorityId,
        q: null,
        requestedForUserId: null,
        status: filters.status,
        type: filters.type,
      }),
      this.adminUserReadRepository.listUsers(),
    ]);
    const scopedTickets = filterByPeriod(
      withoutArchivedTickets(tickets),
      filters.from,
      filters.to,
    );
    const ticketHistoryEntries =
      await this.ticketHistoryReadRepository.listTicketHistoryEntries({
        ticketIds: scopedTickets.map((ticket) => ticket.id),
      });

    return {
      agents: buildAgentPerformance(scopedTickets, ticketHistoryEntries, users),
      filters,
    };
  }
}

function buildAgentPerformance(
  tickets: TicketSummary[],
  entries: TicketHistoryEntry[],
  users: AdminUserSummary[],
): AgentPerformanceReportItem[] {
  const entriesByTicketId = groupEntriesByTicketId(entries);
  const agentsById = new Map(
    users
      .filter(
        (user) => user.role === UserRole.AGENT || user.role === UserRole.ADMIN,
      )
      .map((user) => [user.id, user]),
  );

  for (const ticket of tickets) {
    if (ticket.assignedToUserId && !agentsById.has(ticket.assignedToUserId)) {
      agentsById.set(ticket.assignedToUserId, {
        displayName: null,
        email: null,
        firstName: null,
        groupId: null,
        id: ticket.assignedToUserId,
        isActive: true,
        lastName: null,
        role: UserRole.AGENT,
      });
    }
  }

  return [...agentsById.values()]
    .map((agent) => {
      const agentTickets = tickets.filter(
        (ticket) => ticket.assignedToUserId === agent.id,
      );
      const resolutionDurations = agentTickets
        .map((ticket) =>
          getResolutionDurationMinutes(
            ticket,
            entriesByTicketId.get(ticket.id) ?? [],
          ),
        )
        .filter(isNumber);

      return {
        agentId: agent.id,
        agentName: formatUserName(agent),
        averageResolutionTimeMinutes: average(resolutionDurations),
        ticketsAssigned: agentTickets.length,
        ticketsOverdue: agentTickets.filter(isTicketOverdue).length,
        ticketsResolved: agentTickets.filter(isTicketResolved).length,
      };
    })
    .sort(
      (left, right) =>
        right.ticketsAssigned - left.ticketsAssigned ||
        left.agentName.localeCompare(right.agentName),
    );
}

function groupEntriesByTicketId(
  entries: TicketHistoryEntry[],
): Map<string, TicketHistoryEntry[]> {
  const groupedEntries = new Map<string, TicketHistoryEntry[]>();

  for (const entry of entries) {
    const currentEntries = groupedEntries.get(entry.ticketId) ?? [];
    currentEntries.push(entry);
    groupedEntries.set(entry.ticketId, currentEntries);
  }

  for (const ticketEntries of groupedEntries.values()) {
    ticketEntries.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  return groupedEntries;
}

function getResolutionDurationMinutes(
  ticket: TicketSummary,
  entries: TicketHistoryEntry[],
): number | null {
  const resolutionEntry = entries.find(
    (entry) =>
      entry.eventType === TicketHistoryEventType.RESOLVED ||
      isStatusChangeTo(entry, TicketStatus.RESOLVED),
  );

  return resolutionEntry
    ? differenceInMinutes(ticket.createdAt, resolutionEntry.createdAt)
    : null;
}

function isStatusChangeTo(
  entry: TicketHistoryEntry,
  status: TicketStatus,
): boolean {
  return (
    entry.eventType === TicketHistoryEventType.STATUS_CHANGED &&
    entry.payload?.toStatus === status
  );
}

function differenceInMinutes(fromIso: string, toIso: string): number {
  const durationMs = new Date(toIso).getTime() - new Date(fromIso).getTime();

  return Math.max(0, Math.round(durationMs / 60000));
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function isNumber(value: number | null): value is number {
  return value !== null;
}

function isTicketResolved(ticket: TicketSummary): boolean {
  return (
    ticket.status === TicketStatus.RESOLVED ||
    ticket.status === TicketStatus.CLOSED
  );
}

function isTicketOverdue(ticket: TicketSummary): boolean {
  return (
    ticket.responseSlaStatus === SlaIndicator.OVERDUE ||
    ticket.resolutionSlaStatus === SlaIndicator.OVERDUE
  );
}

function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || user.id;
}

function normalizeFilters(query: AgentPerformanceReportQuery) {
  const from = normalizeOptionalDate(query.from, 'from');
  const to = normalizeOptionalDate(query.to, 'to');

  if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
    throw new BadRequestException('from must be before to.');
  }

  return {
    assignedToUserId: normalizeOptionalText(query.assignedToUserId),
    categoryId: normalizeOptionalText(query.categoryId),
    from,
    priorityId: normalizeOptionalText(query.priorityId),
    status: normalizeTicketStatus(query.status),
    to,
    type: normalizeTicketType(query.type),
  };
}

function filterByPeriod(
  tickets: TicketSummary[],
  from: string | null,
  to: string | null,
): TicketSummary[] {
  if (!from && !to) {
    return tickets;
  }

  const fromTime = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;

  return tickets.filter((ticket) => {
    const createdAtTime = new Date(ticket.createdAt).getTime();

    return createdAtTime >= fromTime && createdAtTime <= toTime;
  });
}

function withoutArchivedTickets(tickets: TicketSummary[]): TicketSummary[] {
  return tickets.filter((ticket) => !ticket.archivedAt);
}

function normalizeOptionalDate(
  value: string | null | undefined,
  fieldName: string,
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date.`);
  }

  return date.toISOString();
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeTicketStatus(
  value: TicketStatus | null | undefined,
): TicketStatus | null {
  if (!value) {
    return null;
  }

  if (!Object.values(TicketStatus).includes(value)) {
    throw new BadRequestException('status is invalid.');
  }

  return value;
}

function normalizeTicketType(
  value: TicketType | null | undefined,
): TicketType | null {
  if (!value) {
    return null;
  }

  if (!Object.values(TicketType).includes(value)) {
    throw new BadRequestException('type is invalid.');
  }

  return value;
}
