import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { ArchiveExpiredTicketsUseCase } from './archive-expired-tickets.use-case';

describe('ArchiveExpiredTicketsUseCase', () => {
  it('archives tickets closed more than 60 days before the reference date', async () => {
    const archiveClosedTicketsBefore = jest.fn().mockResolvedValue(3);
    const useCase = new ArchiveExpiredTicketsUseCase({
      archiveClosedTicketsBefore,
    } as unknown as TicketWriteRepository);

    await expect(
      useCase.execute(new Date('2026-04-17T10:00:00.000Z')),
    ).resolves.toEqual({
      archivedCount: 3,
      cutoff: '2026-02-16T10:00:00.000Z',
    });

    expect(archiveClosedTicketsBefore).toHaveBeenCalledWith(
      '2026-02-16T10:00:00.000Z',
    );
  });
});
