import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketHistoryReadRepository } from '../repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { ListTicketHistoryUseCase } from './list-ticket-history.use-case';

describe('ListTicketHistoryUseCase', () => {
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

  it('lists ticket history for a demandeur on an allowed ticket', async () => {
    const entries = [
      new TicketHistoryEntry(
        'history-1',
        'ticket-1',
        'creator-1',
        TicketHistoryEventType.COMMENT_ADDED,
        { commentId: 'comment-1' },
        '2026-04-02T08:10:00.000Z',
      ),
    ];
    const useCase = new ListTicketHistoryUseCase(
      {
        listTicketHistoryEntries: jest.fn().mockResolvedValue(entries),
      } as TicketHistoryReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute(' ticket-1 ', 'creator-1', UserRole.DEMANDEUR),
    ).resolves.toEqual(entries);
  });

  it('allows agent users in the assignment group', async () => {
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
    const useCase = new ListTicketHistoryUseCase(
      {
        listTicketHistoryEntries: jest.fn().mockResolvedValue([]),
      } as TicketHistoryReadRepository,
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
    const useCase = new ListTicketHistoryUseCase(
      {
        listTicketHistoryEntries: jest.fn(),
      } as TicketHistoryReadRepository,
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
    const useCase = new ListTicketHistoryUseCase(
      {
        listTicketHistoryEntries: jest.fn(),
      } as TicketHistoryReadRepository,
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('   ', 'admin-1', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown tickets', async () => {
    const useCase = new ListTicketHistoryUseCase(
      {
        listTicketHistoryEntries: jest.fn(),
      } as TicketHistoryReadRepository,
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
