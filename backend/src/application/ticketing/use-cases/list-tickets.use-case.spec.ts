import { ListTicketsUseCase } from './list-tickets.use-case';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';

describe('ListTicketsUseCase', () => {
  it('returns ticket summaries from the repository', async () => {
    const repository = {
      list: jest.fn().mockResolvedValue([
        {
          assignedToUserId: null,
          assignmentGroupId: 'group-n1',
          createdAt: '2026-03-30T10:00:00.000Z',
          id: 'ticket-1',
          number: 'TICK-000001',
          priority: PriorityName.MEDIUM,
          status: TicketStatus.OPEN,
          title: 'Creation de compte',
          type: TicketType.REQUEST,
        },
      ]),
    };

    const useCase = new ListTicketsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual([
      {
        assignedToUserId: null,
        assignmentGroupId: 'group-n1',
        createdAt: '2026-03-30T10:00:00.000Z',
        id: 'ticket-1',
        number: 'TICK-000001',
        priority: PriorityName.MEDIUM,
        status: TicketStatus.OPEN,
        title: 'Creation de compte',
        type: TicketType.REQUEST,
      },
    ]);
  });
});
