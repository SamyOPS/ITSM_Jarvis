import { TicketStatus } from '../../../domain/ticketing/ticket-status';
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

  it('rejects a search text shorter than two characters', async () => {
    const useCase = new SearchTicketsUseCase({
      searchTickets: jest.fn(),
    } as unknown as TicketReadRepository);

    await expect(useCase.execute({ q: 'a' })).rejects.toThrow(
      'q must contain at least 2 characters.',
    );
  });
});
