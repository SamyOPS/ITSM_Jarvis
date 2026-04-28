import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { GetTicketByIdUseCase } from './get-ticket-by-id.use-case';

describe('GetTicketByIdUseCase', () => {
  it('returns the ticket detail found by the repository', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const getTicketById = jest.fn().mockResolvedValue(detail);
    const useCase = new GetTicketByIdUseCase({
      getTicketById,
    } as unknown as TicketReadRepository);

    await expect(useCase.execute(' ticket-1 ')).resolves.toBe(detail);
    expect(getTicketById).toHaveBeenCalledWith('ticket-1');
  });

  it('throws when the ticket does not exist', async () => {
    const useCase = new GetTicketByIdUseCase({
      getTicketById: jest.fn().mockResolvedValue(null),
    } as unknown as TicketReadRepository);

    await expect(useCase.execute('ticket-404')).rejects.toThrow(
      'Ticket ticket-404 was not found.',
    );
  });
});
