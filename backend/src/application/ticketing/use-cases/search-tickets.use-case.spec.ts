import { UserRole } from '../../../domain/auth/user-role';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { SearchTicketsUseCase } from './search-tickets.use-case';

describe('SearchTicketsUseCase', () => {
  it('normalizes optional filters before delegating to the repository', async () => {
    const searchTickets = jest.fn().mockResolvedValue([]);
    const useCase = new SearchTicketsUseCase({
      searchTickets,
    } as unknown as TicketReadRepository);

    await expect(
      useCase.execute({
        categoryId: ' category-1 ',
        q: ' vpn ',
        requesterUserId: 'agent-1',
        requesterUserRole: UserRole.AGENT,
        status: TicketStatus.OPEN,
        type: TicketType.INCIDENT,
      }),
    ).resolves.toEqual([]);

    expect(searchTickets).toHaveBeenCalledWith({
      assignedToUserId: null,
      assignmentGroupId: null,
      categoryId: 'category-1',
      channelId: null,
      createdByUserId: null,
      priorityId: null,
      q: 'vpn',
      requestedForUserId: null,
      serviceId: null,
      status: TicketStatus.OPEN,
      type: TicketType.INCIDENT,
    });
  });

  it('limits demandeur users to their own created or requested tickets', async () => {
    const createdTicket = new TicketSummary(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'priority-1',
      'HIGH',
      'category-1',
      'demandeur-1',
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-04-02T10:00:00.000Z',
    );
    const requestedTicket = new TicketSummary(
      'ticket-2',
      'TICK-000002',
      TicketType.REQUEST,
      TicketStatus.OPEN,
      'Acces VPN',
      'priority-2',
      'MEDIUM',
      'category-1',
      'agent-1',
      'demandeur-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-02T09:00:00.000Z',
    );
    const searchTickets = jest
      .fn()
      .mockResolvedValueOnce([createdTicket])
      .mockResolvedValueOnce([requestedTicket]);
    const useCase = new SearchTicketsUseCase({
      searchTickets,
    } as unknown as TicketReadRepository);

    await expect(
      useCase.execute({
        q: 'vpn',
        requesterUserId: 'demandeur-1',
        requesterUserRole: UserRole.DEMANDEUR,
      }),
    ).resolves.toEqual([createdTicket, requestedTicket]);

    expect(searchTickets).toHaveBeenNthCalledWith(1, {
      assignedToUserId: null,
      assignmentGroupId: null,
      categoryId: null,
      channelId: null,
      createdByUserId: 'demandeur-1',
      priorityId: null,
      q: 'vpn',
      requestedForUserId: null,
      serviceId: null,
      status: null,
      type: null,
    });
    expect(searchTickets).toHaveBeenNthCalledWith(2, {
      assignedToUserId: null,
      assignmentGroupId: null,
      categoryId: null,
      channelId: null,
      createdByUserId: null,
      priorityId: null,
      q: 'vpn',
      requestedForUserId: 'demandeur-1',
      serviceId: null,
      status: null,
      type: null,
    });
  });

  it('rejects a search text shorter than two characters', async () => {
    const useCase = new SearchTicketsUseCase({
      searchTickets: jest.fn(),
    } as unknown as TicketReadRepository);

    await expect(
      useCase.execute({
        q: 'a',
        requesterUserId: 'agent-1',
        requesterUserRole: UserRole.AGENT,
      }),
    ).rejects.toThrow('q must contain at least 2 characters.');
  });
});
