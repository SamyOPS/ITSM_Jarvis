import { BadRequestException } from '@nestjs/common';
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
import { GetAgentPerformanceReportUseCase } from './get-agent-performance-report.use-case';

describe('GetAgentPerformanceReportUseCase', () => {
  it('returns performance metrics by agent', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-1', {
        assignedToUserId: 'agent-1',
        createdAt: '2026-04-03T10:00:00.000Z',
        status: TicketStatus.RESOLVED,
      }),
      createTicketSummary('ticket-2', {
        assignedToUserId: 'agent-1',
        resolutionSlaStatus: SlaIndicator.OVERDUE,
        status: TicketStatus.OPEN,
      }),
      createTicketSummary('ticket-3', {
        assignedToUserId: 'agent-2',
        createdAt: '2026-04-03T12:00:00.000Z',
        status: TicketStatus.CLOSED,
      }),
      createTicketSummary('ticket-unassigned', {
        assignedToUserId: null,
      }),
    ]);
    const listTicketHistoryEntries = jest
      .fn()
      .mockResolvedValue([
        createHistoryEntry(
          'history-1',
          'ticket-1',
          TicketHistoryEventType.STATUS_CHANGED,
          '2026-04-03T12:00:00.000Z',
          { toStatus: TicketStatus.RESOLVED },
        ),
        createHistoryEntry(
          'history-2',
          'ticket-3',
          TicketHistoryEventType.RESOLVED,
          '2026-04-03T15:00:00.000Z',
        ),
      ]);
    const useCase = createUseCase({
      listTicketHistoryEntries,
      listUsers: jest
        .fn()
        .mockResolvedValue([
          createUser('agent-1', 'Agent', 'Un'),
          createUser('agent-2', 'Agent', 'Deux'),
        ]),
      searchTickets,
    });

    await expect(useCase.execute()).resolves.toEqual({
      agents: [
        {
          agentId: 'agent-1',
          agentName: 'Agent Un',
          averageResolutionTimeMinutes: 120,
          ticketsAssigned: 2,
          ticketsOverdue: 1,
          ticketsResolved: 1,
        },
        {
          agentId: 'agent-2',
          agentName: 'Agent Deux',
          averageResolutionTimeMinutes: 180,
          ticketsAssigned: 1,
          ticketsOverdue: 0,
          ticketsResolved: 1,
        },
      ],
      filters: {
        assignedToUserId: null,
        categoryId: null,
        from: null,
        priorityId: null,
        status: null,
        to: null,
        type: null,
      },
    });
    expect(listTicketHistoryEntries).toHaveBeenCalledWith({
      ticketIds: ['ticket-1', 'ticket-2', 'ticket-3', 'ticket-unassigned'],
    });
  });

  it('applies period filters before calculating agent performance', async () => {
    const searchTickets = jest.fn().mockResolvedValue([
      createTicketSummary('ticket-before', {
        assignedToUserId: 'agent-1',
        createdAt: '2026-04-01T10:00:00.000Z',
      }),
      createTicketSummary('ticket-inside', {
        assignedToUserId: 'agent-1',
        createdAt: '2026-04-03T10:00:00.000Z',
      }),
    ]);
    const listTicketHistoryEntries = jest.fn().mockResolvedValue([]);
    const useCase = createUseCase({
      listTicketHistoryEntries,
      listUsers: jest.fn().mockResolvedValue([createUser('agent-1')]),
      searchTickets,
    });

    const result = await useCase.execute({
      from: '2026-04-02',
      to: '2026-04-04',
      type: TicketType.INCIDENT,
    });

    expect(result.agents).toEqual([
      {
        agentId: 'agent-1',
        agentName: 'Agent Jarvis',
        averageResolutionTimeMinutes: null,
        ticketsAssigned: 1,
        ticketsOverdue: 0,
        ticketsResolved: 0,
      },
    ]);
    expect(result.filters).toEqual(
      expect.objectContaining({
        from: '2026-04-02T00:00:00.000Z',
        to: '2026-04-04T00:00:00.000Z',
        type: TicketType.INCIDENT,
      }),
    );
    expect(searchTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TicketType.INCIDENT,
      }),
    );
    expect(listTicketHistoryEntries).toHaveBeenCalledWith({
      ticketIds: ['ticket-inside'],
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
    createdAt: string;
    resolutionSlaStatus: SlaIndicator | null;
    responseSlaStatus: SlaIndicator | null;
    status: TicketStatus;
  }> = {},
): TicketSummary {
  return new TicketSummary(
    id,
    'TICK-000001',
    TicketType.INCIDENT,
    overrides.status ?? TicketStatus.OPEN,
    'VPN KO',
    'priority-high',
    null,
    'category-network',
    'user-1',
    null,
    null,
    null,
    overrides.assignedToUserId ?? null,
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

function createUser(id: string, firstName = 'Agent', lastName = 'Jarvis') {
  return {
    displayName: null,
    email: `${id}@jarvis.fr`,
    firstName,
    groupId: 'group-1',
    id,
    isActive: true,
    lastName,
    role: UserRole.AGENT,
  };
}

function createUseCase({
  listTicketHistoryEntries = jest.fn().mockResolvedValue([]),
  listUsers = jest.fn().mockResolvedValue([]),
  searchTickets = jest.fn().mockResolvedValue([]),
}: Partial<{
  listTicketHistoryEntries: jest.Mock;
  listUsers: jest.Mock;
  searchTickets: jest.Mock;
}> = {}): GetAgentPerformanceReportUseCase {
  return new GetAgentPerformanceReportUseCase(
    {
      searchTickets,
    } as unknown as TicketReadRepository,
    {
      listTicketHistoryEntries,
    } as unknown as TicketHistoryReadRepository,
    {
      listUsers,
    } as unknown as AdminUserReadRepository,
  );
}
