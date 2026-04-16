import { GetTicketReportingBreakdownUseCase } from '../../../application/reporting/use-cases/get-ticket-reporting-breakdown.use-case';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { GetTicketReportingOverviewUseCase } from '../../../application/reporting/use-cases/get-ticket-reporting-overview.use-case';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  it('delegates breakdown queries to the use case', async () => {
    const breakdown = {
      filters: {
        from: null,
        priorityId: null,
        status: null,
        to: null,
        type: TicketType.INCIDENT,
      },
      ticketsByAgent: [],
      ticketsByCategory: [],
      ticketsByDay: [],
      ticketsByPriority: [],
      ticketsByStatus: [],
    };
    const execute = jest.fn().mockResolvedValue(breakdown);
    const controller = createController({ breakdownExecute: execute });

    await expect(
      controller.getBreakdown({
        type: TicketType.INCIDENT,
      }),
    ).resolves.toEqual(breakdown);

    expect(execute).toHaveBeenCalledWith({
      type: TicketType.INCIDENT,
    });
  });

  it('delegates overview queries to the use case', async () => {
    const overview = {
      filters: {
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
        responseOverdue: 1,
        resolutionOverdue: 0,
        total: 2,
      },
    };
    const execute = jest.fn().mockResolvedValue(overview);
    const controller = createController({ overviewExecute: execute });

    await expect(
      controller.getOverview({
        from: '2026-04-01',
        priorityId: 'priority-high',
        status: TicketStatus.OPEN,
        to: '2026-04-10',
        type: TicketType.INCIDENT,
      }),
    ).resolves.toEqual(overview);

    expect(execute).toHaveBeenCalledWith({
      from: '2026-04-01',
      priorityId: 'priority-high',
      status: TicketStatus.OPEN,
      to: '2026-04-10',
      type: TicketType.INCIDENT,
    });
  });
});

function createController({
  breakdownExecute = jest.fn(),
  overviewExecute = jest.fn(),
}: Partial<{
  breakdownExecute: jest.Mock;
  overviewExecute: jest.Mock;
}> = {}): ReportsController {
  return new ReportsController(
    {
      execute: breakdownExecute,
    } as unknown as GetTicketReportingBreakdownUseCase,
    {
      execute: overviewExecute,
    } as unknown as GetTicketReportingOverviewUseCase,
  );
}
