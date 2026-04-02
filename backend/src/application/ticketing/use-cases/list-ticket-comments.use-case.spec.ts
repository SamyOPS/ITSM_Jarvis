import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';
import { ListTicketCommentsUseCase } from './list-ticket-comments.use-case';

describe('ListTicketCommentsUseCase', () => {
  const listTicketComments = jest.fn();
  const getTicketById = jest.fn();

  const ticketCommentReadRepository: TicketCommentReadRepository = {
    listTicketComments,
  };

  const ticketReadRepository: TicketReadRepository = {
    getTicketById,
    searchTickets: jest.fn(),
  };

  beforeEach(() => {
    listTicketComments.mockReset();
    getTicketById.mockReset();
  });

  it('returns all comments for agent users', async () => {
    listTicketComments.mockResolvedValue([
      new TicketComment(
        'comment-1',
        'ticket-1',
        'user-1',
        'Analyse en cours',
        true,
        '2026-04-01T10:00:00.000Z',
      ),
    ]);
    getTicketById.mockResolvedValue({ ticket: { id: 'ticket-1' } });
    const useCase = new ListTicketCommentsUseCase(
      ticketCommentReadRepository,
      ticketReadRepository,
    );

    await expect(useCase.execute('ticket-1', UserRole.AGENT)).resolves.toEqual([
      new TicketComment(
        'comment-1',
        'ticket-1',
        'user-1',
        'Analyse en cours',
        true,
        '2026-04-01T10:00:00.000Z',
      ),
    ]);

    expect(listTicketComments).toHaveBeenCalledWith({
      includeInternal: true,
      ticketId: 'ticket-1',
    });
  });

  it('filters internal comments for demandeur users', async () => {
    getTicketById.mockResolvedValue({ ticket: { id: 'ticket-1' } });
    const useCase = new ListTicketCommentsUseCase(
      ticketCommentReadRepository,
      ticketReadRepository,
    );

    await useCase.execute('ticket-1', UserRole.DEMANDEUR);

    expect(listTicketComments).toHaveBeenCalledWith({
      includeInternal: false,
      ticketId: 'ticket-1',
    });
  });

  it('rejects blank ticket ids', async () => {
    const useCase = new ListTicketCommentsUseCase(
      ticketCommentReadRepository,
      ticketReadRepository,
    );

    await expect(useCase.execute('   ', UserRole.ADMIN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown tickets', async () => {
    getTicketById.mockResolvedValue(null);
    const useCase = new ListTicketCommentsUseCase(
      ticketCommentReadRepository,
      ticketReadRepository,
    );

    await expect(
      useCase.execute('ticket-404', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
