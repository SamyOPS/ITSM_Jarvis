import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
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
      '2026-04-02T08:00:00.000Z',
    ),
    null,
    null,
    null,
  );

  it('lists comments for demandeur users when the ticket is accessible', async () => {
    const listTicketComments = jest
      .fn()
      .mockResolvedValue([
        new TicketComment(
          'comment-1',
          'ticket-1',
          'creator-1',
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
      useCase.execute(' ticket-1 ', 'creator-1', UserRole.DEMANDEUR),
    ).resolves.toEqual([
      new TicketComment(
        'comment-1',
        'ticket-1',
        'creator-1',
        'Commentaire public',
        false,
        '2026-04-02T08:10:00.000Z',
      ),
    ]);

    expect(listTicketComments).toHaveBeenCalledWith({
      ticketId: 'ticket-1',
    });
  });

  it('lists comments for agent users when the ticket is accessible', async () => {
    const listTicketComments = jest.fn().mockResolvedValue([]);
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments,
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        getById: jest.fn().mockResolvedValue({
          groupId: null,
          groupIds: [],
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        }),
      } as unknown as UserAssignmentProfileRepository,
    );

    await useCase.execute('ticket-1', 'agent-1', UserRole.AGENT);

    expect(listTicketComments).toHaveBeenCalledWith({
      ticketId: 'ticket-1',
    });
  });

  it('allows agent users in the assignment group', async () => {
    const listTicketComments = jest.fn().mockResolvedValue([]);
    const groupedTicketDetail = new TicketDetail(
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
        'group-7',
        null,
        null,
        '2026-04-02T08:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments,
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(groupedTicketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        getById: jest.fn().mockResolvedValue({
          groupId: 'group-7',
          groupIds: ['group-7'],
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        }),
      } as unknown as UserAssignmentProfileRepository,
    );

    await expect(
      useCase.execute('ticket-1', 'agent-1', UserRole.AGENT),
    ).resolves.toEqual([]);
  });

  it('rejects agent users outside the assignment group', async () => {
    const groupedTicketDetail = new TicketDetail(
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
        'group-7',
        null,
        null,
        '2026-04-02T08:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(groupedTicketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        getById: jest.fn().mockResolvedValue({
          groupId: 'group-1',
          groupIds: ['group-1'],
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        }),
      } as unknown as UserAssignmentProfileRepository,
    );

    await expect(
      useCase.execute('ticket-1', 'agent-1', UserRole.AGENT),
    ).rejects.toBeInstanceOf(ForbiddenException);
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

    await expect(
      useCase.execute('   ', 'admin-1', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty user id', async () => {
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('ticket-1', '   ', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects demandeur users outside the ticket perimeter', async () => {
    const useCase = new ListTicketCommentsUseCase(
      {
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('ticket-1', 'outsider-1', UserRole.DEMANDEUR),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
      useCase.execute('ticket-404', 'admin-1', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
