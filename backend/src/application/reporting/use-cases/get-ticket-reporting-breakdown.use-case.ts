import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AdminUserReadRepository } from '../../auth/repositories/admin-user-read.repository';
import { ReferentialCategoryReadRepository } from '../../referentials/repositories/referential-category-read.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketReadRepository } from '../../ticketing/repositories/ticket-read.repository';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export type TicketReportingBreakdownQuery = {
  assignedToUserId?: string | null;
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

export type TicketReportingBreakdown = {
  filters: {
    assignedToUserId: string | null;
    categoryId: string | null;
    from: string | null;
    priorityId: string | null;
    status: TicketStatus | null;
    to: string | null;
    type: TicketType | null;
  };
  ticketsByAgent: TicketReportingBreakdownItem[];
  ticketsByCategory: TicketReportingBreakdownItem[];
  ticketsByDay: TicketReportingBreakdownDayItem[];
  ticketsByPriority: TicketReportingBreakdownItem[];
  ticketsByStatus: TicketReportingBreakdownItem[];
};

@Injectable()
export class GetTicketReportingBreakdownUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
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
        assignmentGroupId: null,
        categoryId: filters.categoryId,
        channelId: null,
        createdByUserId: null,
        priorityId: filters.priorityId,
        q: null,
        requestedForUserId: null,
        serviceId: null,
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

    return {
      filters,
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
    };
  }
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
