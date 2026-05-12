import { GetAgentPerformanceReportUseCase } from '../../../application/reporting/use-cases/get-agent-performance-report.use-case';
import { GetTicketReportingBreakdownUseCase } from '../../../application/reporting/use-cases/get-ticket-reporting-breakdown.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { GetTicketReportingOverviewUseCase } from '../../../application/reporting/use-cases/get-ticket-reporting-overview.use-case';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  it('delegates agent performance queries to the use case', async () => {
    const agentPerformance = {
      agents: [],
      filters: {
        assignedToUserId: null,
        assignmentGroupId: null,
        categoryId: null,
        from: '2026-04-01T00:00:00.000Z',
        priorityId: null,
        status: null,
        to: '2026-04-10T00:00:00.000Z',
        type: null,
      },
    };
    const execute = jest.fn().mockResolvedValue(agentPerformance);
    const controller = createController({ agentPerformanceExecute: execute });

    await expect(
      controller.getAgentPerformance(
        {
          assignmentGroupId: 'group-1',
          from: '2026-04-01',
          to: '2026-04-10',
        },
        createUser(),
      ),
    ).resolves.toEqual(agentPerformance);

    expect(execute).toHaveBeenCalledWith({
      assignmentGroupId: 'group-1',
      from: '2026-04-01',
      to: '2026-04-10',
    });
  });

  it('delegates breakdown queries to the use case', async () => {
    const breakdown = {
      filters: {
        assignedToUserId: null,
        assignmentGroupId: null,
        categoryId: null,
        from: null,
        priorityId: null,
        status: null,
        to: null,
        type: TicketType.INCIDENT,
      },
      ticketActivityTimeline: [],
      ticketsByAgent: [],
      ticketsByCategory: [],
      ticketsByChannel: [],
      ticketsByDay: [],
      ticketsByPriority: [],
      ticketsByStatus: [],
      ticketsByStatusPeriod: [],
    };
    const execute = jest.fn().mockResolvedValue(breakdown);
    const controller = createController({ breakdownExecute: execute });

    await expect(
      controller.getBreakdown(
        {
          type: TicketType.INCIDENT,
        },
        createUser(),
      ),
    ).resolves.toEqual(breakdown);

    expect(execute).toHaveBeenCalledWith({
      type: TicketType.INCIDENT,
    });
  });

  it('delegates overview queries to the use case', async () => {
    const overview = {
      filters: {
        assignedToUserId: null,
        assignmentGroupId: null,
        categoryId: null,
        from: '2026-04-01T00:00:00.000Z',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
        to: '2026-04-10T00:00:00.000Z',
        type: TicketType.INCIDENT,
      },
      kpis: {
        averageResolutionTimeMinutes: 180,
        averageResponseTimeMinutes: 45,
      },
      totals: {
        closed: 0,
        inProgress: 0,
        open: 2,
        resolved: 0,
        unassigned: 0,
        responseOverdue: 1,
        resolutionOverdue: 0,
        total: 2,
      },
    };
    const execute = jest.fn().mockResolvedValue(overview);
    const controller = createController({ overviewExecute: execute });

    await expect(
      controller.getOverview(
        {
          from: '2026-04-01',
          priorityId: 'priority-high',
          status: TicketStatus.OPEN,
          to: '2026-04-10',
          type: TicketType.INCIDENT,
        },
        createUser(),
      ),
    ).resolves.toEqual(overview);

    expect(execute).toHaveBeenCalledWith({
      from: '2026-04-01',
      priorityId: 'priority-high',
      status: TicketStatus.OPEN,
      to: '2026-04-10',
      type: TicketType.INCIDENT,
    });
  });

  it('forces agent reporting queries to the authenticated agent', async () => {
    const execute = jest.fn().mockResolvedValue({
      filters: {},
      totals: {},
    });
    const controller = createController({ overviewExecute: execute });

    await controller.getOverview(
      {
        assignedToUserId: 'other-agent',
        type: TicketType.INCIDENT,
      },
      createUser({
        id: 'agent-1',
        role: UserRole.AGENT,
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      assignedToUserId: 'agent-1',
      type: TicketType.INCIDENT,
    });
  });
});

function createController({
  agentPerformanceExecute = jest.fn(),
  breakdownExecute = jest.fn(),
  overviewExecute = jest.fn(),
}: Partial<{
  agentPerformanceExecute: jest.Mock;
  breakdownExecute: jest.Mock;
  overviewExecute: jest.Mock;
}> = {}): ReportsController {
  return new ReportsController(
    {
      execute: agentPerformanceExecute,
    } as unknown as GetAgentPerformanceReportUseCase,
    {
      execute: breakdownExecute,
    } as unknown as GetTicketReportingBreakdownUseCase,
    {
      execute: overviewExecute,
    } as unknown as GetTicketReportingOverviewUseCase,
  );
}

function createUser(
  overrides: Partial<{
    id: string;
    role: UserRole;
  }> = {},
) {
  return {
    accessToken: 'access-token',
    email: 'admin@jarvis.fr',
    firstName: 'Admin',
    id: overrides.id ?? 'admin-1',
    lastName: 'Jarvis',
    role: overrides.role ?? UserRole.ADMIN,
  };
}
