import { BadRequestException } from '@nestjs/common';
import { SlaIndicator } from '../../../domain/ticketing/sla-indicator';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketHistoryReadRepository } from '../../ticketing/repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../../ticketing/repositories/ticket-read.repository';
import { GetTicketReportingOverviewUseCase } from './get-ticket-reporting-overview.use-case';

describe('GetTicketReportingOverviewUseCase', () => {
  it('returns ticket counters and SLA overdue counters', async () => {
    const tickets = [
      createTicketSummary('ticket-1', TicketStatus.OPEN, {
        responseSlaStatus: SlaIndicator.OVERDUE,
      }),
      createTicketSummary('ticket-2', TicketStatus.IN_PROGRESS, {
        resolutionSlaStatus: SlaIndicator.OVERDUE,
      }),
      createTicketSummary('ticket-3', TicketStatus.RESOLVED),
      createTicketSummary('ticket-4', TicketStatus.CLOSED),
    ];
    const searchTickets = jest.fn().mockResolvedValue(tickets);
    const listTicketHistoryEntries = jest.fn().mockResolvedValue([]);
    const useCase = createUseCase(searchTickets, listTicketHistoryEntries);

    await expect(useCase.execute()).resolves.toEqual({
      filters: {
        assignedToUserId: null,
        assignmentGroupId: null,
        categoryId: null,
        from: null,
        priorityId: null,
        status: null,
        to: null,
        type: null,
      },
      kpis: {
        averageResolutionTimeMinutes: null,
        averageResponseTimeMinutes: null,
      },
      totals: {
        assigned: 0,
        closed: 1,
        incidents: 4,
        inProgress: 1,
        open: 1,
        pending: 0,
        requests: 0,
        resolved: 1,
        responseOverdue: 1,
        resolutionOverdue: 1,
        total: 4,
        unassigned: 4,
      },
    });

    expect(searchTickets).toHaveBeenCalledWith({
      assignedToUserId: null,
      assignmentGroupId: null,
      categoryId: null,
      channelId: null,
      createdByUserId: null,
      priorityId: null,
      q: null,
      requestedForUserId: null,
      status: null,
      type: null,
    });
    expect(listTicketHistoryEntries).toHaveBeenCalledWith({
      ticketIds: ['ticket-1', 'ticket-2', 'ticket-3', 'ticket-4'],
    });
  });

  it('delegates simple filters and applies period filtering', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-before', TicketStatus.OPEN, {
        createdAt: '2026-04-01T09:00:00.000Z',
      }),
      createTicketSummary('ticket-inside', TicketStatus.OPEN, {
        createdAt: '2026-04-03T09:00:00.000Z',
      }),
    ]);
    const listTicketHistoryEntries = jest.fn().mockResolvedValue([]);
    const useCase = createUseCase(searchTickets, listTicketHistoryEntries);

    await expect(
      useCase.execute({
        assignmentGroupId: 'group-1',
        from: '2026-04-02',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
        to: '2026-04-04',
        type: TicketType.INCIDENT,
      }),
    ).resolves.toMatchObject({
      filters: {
        assignmentGroupId: 'group-1',
        from: '2026-04-02T00:00:00.000Z',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
        to: '2026-04-04T23:59:59.999Z',
        type: TicketType.INCIDENT,
      },
      totals: {
        open: 1,
        unassigned: 1,
        total: 1,
      },
    });

    expect(searchTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentGroupId: 'group-1',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
        type: TicketType.INCIDENT,
      }),
    );
    expect(listTicketHistoryEntries).toHaveBeenCalledWith({
      ticketIds: ['ticket-inside'],
    });
  });

  it('calculates average response and resolution KPI from ticket history', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-1', TicketStatus.RESOLVED, {
        createdAt: '2026-04-03T10:00:00.000Z',
      }),
      createTicketSummary('ticket-2', TicketStatus.RESOLVED, {
        createdAt: '2026-04-03T11:00:00.000Z',
      }),
      createTicketSummary('ticket-without-resolution', TicketStatus.OPEN, {
        createdAt: '2026-04-03T12:00:00.000Z',
        responseSlaStatus: null,
        resolutionSlaStatus: null,
      }),
      createTicketSummary('ticket-overdue', TicketStatus.OPEN, {
        createdAt: '2026-04-03T13:00:00.000Z',
        responseSlaStatus: SlaIndicator.OVERDUE,
        resolutionSlaStatus: SlaIndicator.OVERDUE,
      }),
    ]);
    const listTicketHistoryEntries = jest
      .fn()
      .mockResolvedValue([
        createHistoryEntry(
          'history-1',
          'ticket-1',
          TicketHistoryEventType.ASSIGNED,
          '2026-04-03T10:30:00.000Z',
        ),
        createHistoryEntry(
          'history-2',
          'ticket-1',
          TicketHistoryEventType.STATUS_CHANGED,
          '2026-04-03T12:00:00.000Z',
          { toStatus: TicketStatus.RESOLVED },
        ),
        createHistoryEntry(
          'history-3',
          'ticket-2',
          TicketHistoryEventType.STATUS_CHANGED,
          '2026-04-03T12:00:00.000Z',
          { toStatus: TicketStatus.IN_PROGRESS },
        ),
        createHistoryEntry(
          'history-4',
          'ticket-2',
          TicketHistoryEventType.RESOLVED,
          '2026-04-03T15:00:00.000Z',
        ),
      ]);
    const useCase = createUseCase(searchTickets, listTicketHistoryEntries);

    await expect(useCase.execute()).resolves.toMatchObject({
      kpis: {
        averageResolutionTimeMinutes: 180,
        averageResponseTimeMinutes: 45,
      },
      totals: {
        responseOverdue: 1,
        resolutionOverdue: 1,
        total: 4,
        unassigned: 4,
      },
    });
  });

  it('rejects invalid date ranges', async () => {
    const useCase = createUseCase(jest.fn(), jest.fn());

    await expect(
      useCase.execute({
        from: '2026-04-10',
        to: '2026-04-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createTicketSummary(
  id: string,
  status: TicketStatus,
  overrides: Partial<{
    createdAt: string;
    resolutionSlaStatus: SlaIndicator | null;
    responseSlaStatus: SlaIndicator | null;
  }> = {},
): TicketSummary {
  return new TicketSummary(
    id,
    'TICK-000001',
    TicketType.INCIDENT,
    status,
    'VPN KO',
    'priority-high',
    'HIGH',
    'category-1',
    'user-1',
    null,
    null,
    null,
    null,
    null,
    overrides.createdAt ?? '2026-04-03T10:00:00.000Z',
    null,
    null,
    overrides.responseSlaStatus ?? null,
    overrides.resolutionSlaStatus ?? null,
  );
}

function createHistoryEntry(
  id: string,
  ticketId: string,
  eventType: TicketHistoryEventType,
  createdAt: string,
  payload: Record<string, unknown> | null = null,
): TicketHistoryEntry {
  return new TicketHistoryEntry(
    id,
    ticketId,
    'agent-1',
    eventType,
    payload,
    createdAt,
  );
}

function createUseCase(
  searchTickets: jest.Mock,
  listTicketHistoryEntries: jest.Mock,
): GetTicketReportingOverviewUseCase {
  return new GetTicketReportingOverviewUseCase(
    {
      searchTickets,
    } as unknown as TicketReadRepository,
    {
      listTicketHistoryEntries,
    } as unknown as TicketHistoryReadRepository,
  );
}
