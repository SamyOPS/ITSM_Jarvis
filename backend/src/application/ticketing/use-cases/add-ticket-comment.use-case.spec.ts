import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { AddTicketCommentUseCase } from './add-ticket-comment.use-case';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketCommentWriteRepository } from '../repositories/ticket-comment-write.repository';

describe('AddTicketCommentUseCase', () => {
  const addTicketComment = jest.fn();
  const getTicketById = jest.fn();

  const ticketCommentWriteRepository: TicketCommentWriteRepository = {
    addTicketComment,
  };

  const ticketReadRepository: TicketReadRepository = {
    getTicketById,
    searchTickets: jest.fn(),
  };

  beforeEach(() => {
    addTicketComment.mockReset();
    getTicketById.mockReset();
  });

  it('adds a public comment for an authenticated user', async () => {
    addTicketComment.mockResolvedValue(
      new TicketComment(
        'comment-1',
        'ticket-1',
        'user-1',
        'Analyse lancee',
        false,
        '2026-04-01T10:00:00.000Z',
      ),
    );
    getTicketById.mockResolvedValue({ ticket: { id: 'ticket-1' } });
    const useCase = new AddTicketCommentUseCase(
      ticketCommentWriteRepository,
      ticketReadRepository,
    );

    await expect(
      useCase.execute({
        authorRole: UserRole.AGENT,
        authorUserId: 'user-1',
        body: '  Analyse lancee  ',
        ticketId: ' ticket-1 ',
      }),
    ).resolves.toEqual(
      new TicketComment(
        'comment-1',
        'ticket-1',
        'user-1',
        'Analyse lancee',
        false,
        '2026-04-01T10:00:00.000Z',
      ),
    );

    expect(addTicketComment).toHaveBeenCalledWith({
      authorUserId: 'user-1',
      body: 'Analyse lancee',
      isInternal: false,
      ticketId: 'ticket-1',
    });
  });

  it('rejects empty comment bodies', async () => {
    const useCase = new AddTicketCommentUseCase(
      ticketCommentWriteRepository,
      ticketReadRepository,
    );

    await expect(
      useCase.execute({
        authorRole: UserRole.AGENT,
        authorUserId: 'user-1',
        body: '   ',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects internal comments from demandeur users', async () => {
    const useCase = new AddTicketCommentUseCase(
      ticketCommentWriteRepository,
      ticketReadRepository,
    );

    await expect(
      useCase.execute({
        authorRole: UserRole.DEMANDEUR,
        authorUserId: 'user-1',
        body: 'Commentaire interne',
        isInternal: true,
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow('Demandeur users cannot create internal comments.');
  });

  it('rejects comments on unknown tickets', async () => {
    getTicketById.mockResolvedValue(null);
    const useCase = new AddTicketCommentUseCase(
      ticketCommentWriteRepository,
      ticketReadRepository,
    );

    await expect(
      useCase.execute({
        authorRole: UserRole.ADMIN,
        authorUserId: 'user-1',
        body: 'Commentaire',
        isInternal: true,
        ticketId: 'ticket-404',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
