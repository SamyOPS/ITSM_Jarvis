import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SlaIndicator } from '../../../domain/ticketing/sla-indicator';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketHistoryReadRepository } from '../../ticketing/repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../../ticketing/repositories/ticket-read.repository';

export type TicketReportingOverviewQuery = {
  assignedToUserId?: string | null;
  categoryId?: string | null;
  from?: string | null;
  priorityId?: string | null;
  status?: TicketStatus | null;
  to?: string | null;
  type?: TicketType | null;
};

export type TicketReportingOverview = {
  filters: {
    assignedToUserId: string | null;
    categoryId: string | null;
    from: string | null;
    priorityId: string | null;
    status: TicketStatus | null;
    to: string | null;
    type: TicketType | null;
  };
  totals: {
    closed: number;
    inProgress: number;
    open: number;
    resolved: number;
    responseOverdue: number;
    resolutionOverdue: number;
    total: number;
  };
  kpis: {
    averageResolutionTimeMinutes: number | null;
    averageResponseTimeMinutes: number | null;
  };
};

@Injectable()
export class GetTicketReportingOverviewUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketHistoryReadRepository)
    private readonly ticketHistoryReadRepository: TicketHistoryReadRepository,
  ) {}

  async execute(
    query: TicketReportingOverviewQuery = {},
  ): Promise<TicketReportingOverview> {
    const filters = normalizeFilters(query);
    const tickets = await this.ticketReadRepository.searchTickets({
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
    });
    const scopedTickets = filterByPeriod(tickets, filters.from, filters.to);
    const ticketHistoryEntries =
      await this.ticketHistoryReadRepository.listTicketHistoryEntries({
        ticketIds: scopedTickets.map((ticket) => ticket.id),
      });
    const kpis = calculateKpis(scopedTickets, ticketHistoryEntries);

    return {
      filters,
      kpis,
      totals: {
        closed: countByStatus(scopedTickets, TicketStatus.CLOSED),
        inProgress: countByStatus(scopedTickets, TicketStatus.IN_PROGRESS),
        open: countByStatus(scopedTickets, TicketStatus.OPEN),
        resolved: countByStatus(scopedTickets, TicketStatus.RESOLVED),
        responseOverdue: scopedTickets.filter(
          (ticket) => ticket.responseSlaStatus === SlaIndicator.OVERDUE,
        ).length,
        resolutionOverdue: scopedTickets.filter(
          (ticket) => ticket.resolutionSlaStatus === SlaIndicator.OVERDUE,
        ).length,
        total: scopedTickets.length,
      },
    };
  }
}

function calculateKpis(
  tickets: TicketSummary[],
  entries: TicketHistoryEntry[],
): TicketReportingOverview['kpis'] {
  const entriesByTicketId = groupEntriesByTicketId(entries);
  const responseDurations = tickets
    .map((ticket) =>
      getResponseDurationMinutes(
        ticket,
        entriesByTicketId.get(ticket.id) ?? [],
      ),
    )
    .filter(isNumber);
  const resolutionDurations = tickets
    .map((ticket) =>
      getResolutionDurationMinutes(
        ticket,
        entriesByTicketId.get(ticket.id) ?? [],
      ),
    )
    .filter(isNumber);

  return {
    averageResolutionTimeMinutes: average(resolutionDurations),
    averageResponseTimeMinutes: average(responseDurations),
  };
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

function getResponseDurationMinutes(
  ticket: TicketSummary,
  entries: TicketHistoryEntry[],
): number | null {
  const responseEntry = entries.find(
    (entry) =>
      entry.eventType === TicketHistoryEventType.ASSIGNED ||
      isStatusChangeTo(entry, TicketStatus.IN_PROGRESS),
  );

  return responseEntry
    ? differenceInMinutes(ticket.createdAt, responseEntry.createdAt)
    : null;
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

function normalizeFilters(query: TicketReportingOverviewQuery) {
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

function countByStatus(tickets: TicketSummary[], status: TicketStatus): number {
  return tickets.filter((ticket) => ticket.status === status).length;
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
