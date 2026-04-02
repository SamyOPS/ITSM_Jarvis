import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { ListTicketCommentsUseCase } from './list-ticket-comments.use-case';

describe('ListTicketCommentsUseCase', () => {
  const ticketDetail = new TicketDetail(
    new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'Impossible de se connecter',
      'priority-1',
      'category-1',
      'creator-1',
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-04-02T08:00:00.000Z',
    ),
    null,
    null,
    null,
  );

  it('hides internal comments for demandeur users', async () => {
    const listTicketComments = jest
      .fn()
      .mockResolvedValue([
        new TicketComment(
          'comment-1',
          'ticket-1',
          'user-1',
          'Commentaire public',
          false,
          '2026-04-02T08:10:00.000Z',
        ),
      ]);
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments,
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute(' ticket-1 ', UserRole.DEMANDEUR),
    ).resolves.toEqual([
      new TicketComment(
        'comment-1',
        'ticket-1',
        'user-1',
        'Commentaire public',
        false,
        '2026-04-02T08:10:00.000Z',
      ),
    ]);

    expect(listTicketComments).toHaveBeenCalledWith({
      includeInternal: false,
      ticketId: 'ticket-1',
    });
  });

  it('includes internal comments for agent users', async () => {
    const listTicketComments = jest.fn().mockResolvedValue([]);
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments,
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await useCase.execute('ticket-1', UserRole.AGENT);

    expect(listTicketComments).toHaveBeenCalledWith({
      includeInternal: true,
      ticketId: 'ticket-1',
    });
  });

  it('rejects an empty ticket id', async () => {
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(useCase.execute('   ', UserRole.ADMIN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown tickets', async () => {
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(null),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('ticket-404', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
