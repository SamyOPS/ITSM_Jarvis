import { BadRequestException } from '@nestjs/common';
import { AdminUserReadRepository } from '../../auth/repositories/admin-user-read.repository';
import { ReferentialCategory } from '../../../domain/referentials/referential-category';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { ReferentialCategoryReadRepository } from '../../referentials/repositories/referential-category-read.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketHistoryReadRepository } from '../../ticketing/repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../../ticketing/repositories/ticket-read.repository';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { GetTicketReportingBreakdownUseCase } from './get-ticket-reporting-breakdown.use-case';

describe('GetTicketReportingBreakdownUseCase', () => {
  it('returns ticket breakdowns with readable names', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-1', {
        assignedToUserId: 'agent-1',
        categoryId: 'category-network',
        createdAt: '2026-04-03T10:00:00.000Z',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
      }),
      createTicketSummary('ticket-2', {
        assignedToUserId: 'agent-1',
        categoryId: 'category-network',
        createdAt: '2026-04-03T12:00:00.000Z',
        priorityId: 'priority-high',
        status: TicketStatus.IN_PROGRESS,
      }),
      createTicketSummary('ticket-3', {
        assignedToUserId: null,
        categoryId: 'category-access',
        createdAt: '2026-04-04T08:00:00.000Z',
        priorityId: 'priority-medium',
        status: TicketStatus.OPEN,
      }),
    ]);
    const useCase = createUseCase({
      listCategories: jest
        .fn()
        .mockResolvedValue([
          new ReferentialCategory('category-network', 'Reseau', null),
          new ReferentialCategory('category-access', 'Acces', null),
        ]),
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-high', PriorityName.HIGH, 3, 4, 8),
          new ReferentialPriority(
            'priority-medium',
            PriorityName.MEDIUM,
            2,
            8,
            24,
          ),
        ]),
      listUsers: jest.fn().mockResolvedValue([
        {
          displayName: null,
          email: 'agent@jarvis.fr',
          firstName: 'Agent',
          groupId: 'group-1',
          id: 'agent-1',
          isActive: true,
          lastName: 'Jarvis',
          role: 'AGENT',
        },
      ]),
      searchTickets,
    });

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
      ticketActivityTimeline: [
        {
          closed: 0,
          open: 3,
          overdue: 0,
          period: '2026-04',
          resolved: 0,
        },
      ],
      ticketsByAgent: [
        {
          count: 2,
          id: 'agent-1',
          name: 'Agent Jarvis',
        },
        {
          count: 1,
          id: null,
          name: 'Non assigne',
        },
      ],
      ticketsByCategory: [
        {
          count: 2,
          id: 'category-network',
          name: 'Reseau',
        },
        {
          count: 1,
          id: 'category-access',
          name: 'Acces',
        },
      ],
      ticketsByChannel: [
        {
          count: 3,
          id: null,
          name: 'Non renseigne',
        },
      ],
      ticketsByDay: [
        {
          count: 2,
          date: '2026-04-03',
        },
        {
          count: 1,
          date: '2026-04-04',
        },
      ],
      ticketsByPriority: [
        {
          count: 2,
          id: 'priority-high',
          name: PriorityName.HIGH,
        },
        {
          count: 1,
          id: 'priority-medium',
          name: PriorityName.MEDIUM,
        },
      ],
      ticketsByStatus: [
        {
          count: 2,
          id: TicketStatus.OPEN,
          name: TicketStatus.OPEN,
        },
        {
          count: 1,
          id: TicketStatus.IN_PROGRESS,
          name: TicketStatus.IN_PROGRESS,
        },
      ],
      ticketsByStatusPeriod: [
        {
          closed: 0,
          inProgress: 1,
          open: 2,
          pending: 0,
          period: '2026-04',
          resolved: 0,
        },
      ],
      ticketsResolutionTimeByPriority: [],
    });
  });

  it('delegates simple filters and applies period filtering', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-before', {
        createdAt: '2026-04-01T09:00:00.000Z',
      }),
      createTicketSummary('ticket-inside', {
        createdAt: '2026-04-03T09:00:00.000Z',
      }),
    ]);
    const useCase = createUseCase({ searchTickets });

    const result = await useCase.execute({
      assignmentGroupId: 'group-1',
      from: '2026-04-02',
      priorityId: 'priority-high',
      status: TicketStatus.OPEN,
      to: '2026-04-04',
      type: TicketType.INCIDENT,
    });

    expect(result.filters).toEqual({
      assignedToUserId: null,
      assignmentGroupId: 'group-1',
      categoryId: null,
      from: '2026-04-02T00:00:00.000Z',
      priorityId: 'priority-high',
      status: TicketStatus.OPEN,
      to: '2026-04-04T23:59:59.999Z',
      type: TicketType.INCIDENT,
    });
    expect(result.ticketsByDay).toEqual([
      {
        count: 1,
        date: '2026-04-03',
      },
    ]);
    expect(searchTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentGroupId: 'group-1',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
        type: TicketType.INCIDENT,
      }),
    );
  });

  it('returns average resolution time by priority', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-high-1', {
        createdAt: '2026-04-03T10:00:00.000Z',
        priorityId: 'priority-high',
        status: TicketStatus.RESOLVED,
      }),
      createTicketSummary('ticket-high-2', {
        createdAt: '2026-04-03T10:00:00.000Z',
        priorityId: 'priority-high',
        status: TicketStatus.CLOSED,
      }),
      createTicketSummary('ticket-medium', {
        createdAt: '2026-04-03T10:00:00.000Z',
        priorityId: 'priority-medium',
        status: TicketStatus.RESOLVED,
      }),
    ]);
    const listTicketHistoryEntries = jest
      .fn()
      .mockResolvedValue([
        createHistoryEntry(
          'history-high-1',
          'ticket-high-1',
          '2026-04-03T12:00:00.000Z',
        ),
        createHistoryEntry(
          'history-high-2',
          'ticket-high-2',
          '2026-04-03T14:00:00.000Z',
        ),
        createHistoryEntry(
          'history-medium',
          'ticket-medium',
          '2026-04-03T11:00:00.000Z',
        ),
      ]);
    const useCase = createUseCase({
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-high', PriorityName.HIGH, 3, 4, 8),
          new ReferentialPriority(
            'priority-medium',
            PriorityName.MEDIUM,
            2,
            8,
            24,
          ),
        ]),
      listTicketHistoryEntries,
      searchTickets,
    });

    const result = await useCase.execute();

    expect(result.ticketsResolutionTimeByPriority).toEqual([
      {
        count: 60,
        id: 'priority-medium',
        name: PriorityName.MEDIUM,
      },
      {
        count: 180,
        id: 'priority-high',
        name: PriorityName.HIGH,
      },
    ]);
    expect(listTicketHistoryEntries).toHaveBeenCalledWith({
      ticketIds: ['ticket-high-1', 'ticket-high-2', 'ticket-medium'],
    });
  });

  it('rejects invalid date ranges', async () => {
    const useCase = createUseCase();

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
  overrides: Partial<{
    assignedToUserId: string | null;
    categoryId: string;
    createdAt: string;
    priorityId: string;
    status: TicketStatus;
  }> = {},
): TicketSummary {
  return new TicketSummary(
    id,
    'TICK-000001',
    TicketType.INCIDENT,
    overrides.status ?? TicketStatus.OPEN,
    'VPN KO',
    overrides.priorityId ?? 'priority-high',
    null,
    overrides.categoryId ?? 'category-network',
    'user-1',
    null,
    null,
    null,
    overrides.assignedToUserId ?? null,
    null,
    overrides.createdAt ?? '2026-04-03T10:00:00.000Z',
  );
}

function createHistoryEntry(
  id: string,
  ticketId: string,
  createdAt: string,
): TicketHistoryEntry {
  return new TicketHistoryEntry(
    id,
    ticketId,
    'agent-1',
    TicketHistoryEventType.RESOLVED,
    null,
    createdAt,
  );
}

function createUseCase({
  listCategories = jest.fn().mockResolvedValue([]),
  listTicketHistoryEntries = jest.fn().mockResolvedValue([]),
  listPriorities = jest.fn().mockResolvedValue([]),
  listUsers = jest.fn().mockResolvedValue([]),
  searchTickets = jest.fn().mockResolvedValue([]),
}: Partial<{
  listCategories: jest.Mock;
  listTicketHistoryEntries: jest.Mock;
  listPriorities: jest.Mock;
  listUsers: jest.Mock;
  searchTickets: jest.Mock;
}> = {}): GetTicketReportingBreakdownUseCase {
  return new GetTicketReportingBreakdownUseCase(
    {
      searchTickets,
    } as unknown as TicketReadRepository,
    {
      listTicketHistoryEntries,
    } as unknown as TicketHistoryReadRepository,
    {
      listUsers,
    } as unknown as AdminUserReadRepository,
    {
      listCategories,
    } as unknown as ReferentialCategoryReadRepository,
    {
      listPriorities,
    } as unknown as ReferentialPriorityReadRepository,
  );
}
