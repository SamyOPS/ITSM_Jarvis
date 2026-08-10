import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AdminUserReadRepository } from '../../auth/repositories/admin-user-read.repository';
import { ReferentialCategoryReadRepository } from '../../referentials/repositories/referential-category-read.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketHistoryReadRepository } from '../../ticketing/repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../../ticketing/repositories/ticket-read.repository';
import { SlaIndicator } from '../../../domain/ticketing/sla-indicator';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export type TicketReportingBreakdownQuery = {
  assignedToUserId?: string | null;
  assignmentGroupId?: string | null;
  categoryId?: string | null;
  from?: string | null;
  priorityId?: string | null;
  status?: TicketStatus | null;
  to?: string | null;
  type?: TicketType | null;
};

export type TicketReportingBreakdownItem = {
  count: number;
  id: string | null;
  name: string;
};

export type TicketReportingBreakdownDayItem = {
  count: number;
  date: string;
};

export type TicketReportingTimelineItem = {
  closed: number;
  open: number;
  overdue: number;
  period: string;
  resolved: number;
};

export type TicketReportingStatusPeriodItem = {
  closed: number;
  inProgress: number;
  open: number;
  pending: number;
  period: string;
  resolved: number;
};

export type TicketReportingBreakdown = {
  filters: {
    assignedToUserId: string | null;
    assignmentGroupId: string | null;
    categoryId: string | null;
    from: string | null;
    priorityId: string | null;
    status: TicketStatus | null;
    to: string | null;
    type: TicketType | null;
  };
  ticketActivityTimeline: TicketReportingTimelineItem[];
  ticketsByAgent: TicketReportingBreakdownItem[];
  ticketsByCategory: TicketReportingBreakdownItem[];
  ticketsByChannel: TicketReportingBreakdownItem[];
  ticketsByDay: TicketReportingBreakdownDayItem[];
  ticketsByPriority: TicketReportingBreakdownItem[];
  ticketsByStatus: TicketReportingBreakdownItem[];
  ticketsByStatusPeriod: TicketReportingStatusPeriodItem[];
  ticketsResolutionTimeByPriority: TicketReportingBreakdownItem[];
};

@Injectable()
export class GetTicketReportingBreakdownUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketHistoryReadRepository)
    private readonly ticketHistoryReadRepository: TicketHistoryReadRepository,
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
    @Inject(ReferentialCategoryReadRepository)
    private readonly categoryReadRepository: ReferentialCategoryReadRepository,
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityReadRepository: ReferentialPriorityReadRepository,
  ) {}

  async execute(
    query: TicketReportingBreakdownQuery = {},
  ): Promise<TicketReportingBreakdown> {
    const filters = normalizeFilters(query);
    const [tickets, users, categories, priorities] = await Promise.all([
      this.ticketReadRepository.searchTickets({
        assignedToUserId: filters.assignedToUserId,
        assignmentGroupId: filters.assignmentGroupId,
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
      this.categoryReadRepository.listCategories(),
      this.priorityReadRepository.listPriorities(),
    ]);
    const scopedTickets = filterByPeriod(
      withoutArchivedTickets(tickets),
      filters.from,
      filters.to,
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    const categoriesById = new Map(
      categories.map((category) => [category.id, category]),
    );
    const prioritiesById = new Map(
      priorities.map((priority) => [priority.id, priority]),
    );
    const ticketHistoryEntries =
      await this.ticketHistoryReadRepository.listTicketHistoryEntries({
        ticketIds: scopedTickets.map((ticket) => ticket.id),
      });

    return {
      filters,
      ticketActivityTimeline: buildTicketActivityTimeline(scopedTickets),
      ticketsByAgent: countByKey(
        scopedTickets,
        (ticket) => ticket.assignedToUserId,
        (agentId) =>
          agentId
            ? formatUserName(usersById.get(agentId), agentId)
            : 'Non assigne',
      ),
      ticketsByCategory: countByKey(
        scopedTickets,
        (ticket) => ticket.categoryId,
        (categoryId) =>
          categoryId
            ? (categoriesById.get(categoryId)?.name ?? categoryId)
            : 'Non definie',
      ),
      ticketsByChannel: countByKey(
        scopedTickets,
        (ticket) => ticket.channelId,
        (channelId) => channelId ?? 'Non renseigne',
      ),
      ticketsByDay: countByDay(scopedTickets),
      ticketsByPriority: countByKey(
        scopedTickets,
        (ticket) => ticket.priorityId,
        (priorityId) =>
          priorityId
            ? (prioritiesById.get(priorityId)?.name ?? priorityId)
            : 'Non definie',
      ),
      ticketsByStatus: countByKey(
        scopedTickets,
        (ticket) => ticket.status,
        (status) => status ?? 'Non defini',
      ),
      ticketsByStatusPeriod: buildTicketStatusPeriod(scopedTickets),
      ticketsResolutionTimeByPriority: buildResolutionTimeByPriority(
        scopedTickets,
        ticketHistoryEntries,
        prioritiesById,
      ),
    };
  }
}

function buildResolutionTimeByPriority(
  tickets: TicketSummary[],
  entries: TicketHistoryEntry[],
  prioritiesById: Map<string, { level: number; name: string }>,
): TicketReportingBreakdownItem[] {
  const entriesByTicketId = groupEntriesByTicketId(entries);
  const buckets = new Map<
    string,
    {
      count: number;
      id: string | null;
      totalMinutes: number;
    }
  >();

  for (const ticket of tickets) {
    const duration = getResolutionDurationMinutes(
      ticket,
      entriesByTicketId.get(ticket.id) ?? [],
    );

    if (duration === null) {
      continue;
    }

    const id = ticket.priorityId;
    const key = id ?? '__null__';
    const current = buckets.get(key) ?? {
      count: 0,
      id,
      totalMinutes: 0,
    };

    buckets.set(key, {
      ...current,
      count: current.count + 1,
      totalMinutes: current.totalMinutes + duration,
    });
  }

  return [...buckets.values()]
    .map((item) => ({
      count: Math.round(item.totalMinutes / item.count),
      id: item.id,
      name: item.id
        ? (prioritiesById.get(item.id)?.name ?? item.id)
        : 'Non definie',
    }))
    .sort((left, right) => {
      const leftLevel = left.id
        ? (prioritiesById.get(left.id)?.level ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;
      const rightLevel = right.id
        ? (prioritiesById.get(right.id)?.level ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;

      return leftLevel - rightLevel || left.name.localeCompare(right.name);
    });
}

function buildTicketActivityTimeline(
  tickets: TicketSummary[],
): TicketReportingTimelineItem[] {
  const buckets = new Map<
    string,
    {
      closed: number;
      open: number;
      overdue: number;
      period: string;
      resolved: number;
    }
  >();

  for (const ticket of tickets) {
    const period = ticket.createdAt.slice(0, 7);
    const current = buckets.get(period) ?? {
      closed: 0,
      open: 0,
      overdue: 0,
      period,
      resolved: 0,
    };

    if (
      ticket.status === TicketStatus.OPEN ||
      ticket.status === TicketStatus.IN_PROGRESS ||
      ticket.status === TicketStatus.PENDING
    ) {
      current.open += 1;
    }

    if (ticket.status === TicketStatus.RESOLVED) {
      current.resolved += 1;
    }

    if (ticket.status === TicketStatus.CLOSED) {
      current.closed += 1;
    }

    if (isTicketOverdue(ticket)) {
      current.overdue += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
  );
}

function buildTicketStatusPeriod(
  tickets: TicketSummary[],
): TicketReportingStatusPeriodItem[] {
  const buckets = new Map<
    string,
    {
      closed: number;
      inProgress: number;
      open: number;
      pending: number;
      period: string;
      resolved: number;
    }
  >();

  for (const ticket of tickets) {
    const period = ticket.createdAt.slice(0, 7);
    const current = buckets.get(period) ?? {
      closed: 0,
      inProgress: 0,
      open: 0,
      pending: 0,
      period,
      resolved: 0,
    };

    if (ticket.status === TicketStatus.OPEN) {
      current.open += 1;
    } else if (ticket.status === TicketStatus.IN_PROGRESS) {
      current.inProgress += 1;
    } else if (ticket.status === TicketStatus.PENDING) {
      current.pending += 1;
    } else if (ticket.status === TicketStatus.RESOLVED) {
      current.resolved += 1;
    } else if (ticket.status === TicketStatus.CLOSED) {
      current.closed += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
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

function isTicketOverdue(ticket: TicketSummary): boolean {
  return ticket.resolutionSlaStatus === SlaIndicator.OVERDUE;
}

function countByKey(
  tickets: TicketSummary[],
  getKey: (ticket: TicketSummary) => string | null,
  getName: (key: string | null) => string,
): TicketReportingBreakdownItem[] {
  const counters = new Map<string, { count: number; id: string | null }>();

  for (const ticket of tickets) {
    const id = getKey(ticket);
    const key = id ?? '__null__';
    const current = counters.get(key) ?? { count: 0, id };
    counters.set(key, {
      ...current,
      count: current.count + 1,
    });
  }

  return [...counters.values()]
    .map((item) => ({
      count: item.count,
      id: item.id,
      name: getName(item.id),
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    );
}

function countByDay(
  tickets: TicketSummary[],
): TicketReportingBreakdownDayItem[] {
  const counters = new Map<string, number>();

  for (const ticket of tickets) {
    const date = ticket.createdAt.slice(0, 10);
    counters.set(date, (counters.get(date) ?? 0) + 1);
  }

  return [...counters.entries()]
    .map(([date, count]) => ({ count, date }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function formatUserName(
  user:
    | {
        displayName: string | null;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | undefined,
  fallback: string,
): string {
  if (!user) {
    return fallback;
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || fallback;
}

function normalizeFilters(query: TicketReportingBreakdownQuery) {
  const from = normalizeOptionalDate(query.from, 'from', 'start');
  const to = normalizeOptionalDate(query.to, 'to', 'end');

  if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
    throw new BadRequestException('from must be before to.');
  }

  return {
    assignedToUserId: normalizeOptionalText(query.assignedToUserId),
    assignmentGroupId: normalizeOptionalText(query.assignmentGroupId),
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
  boundary: 'end' | 'start',
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date.`);
  }

  if (boundary === 'start') {
    date.setUTCHours(0, 0, 0, 0);
  } else {
    date.setUTCHours(23, 59, 59, 999);
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
