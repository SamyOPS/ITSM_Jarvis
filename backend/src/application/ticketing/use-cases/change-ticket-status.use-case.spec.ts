import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { UserRole } from '../../../domain/auth/user-role';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { ChangeTicketStatusUseCase } from './change-ticket-status.use-case';

describe('ChangeTicketStatusUseCase', () => {
  function createUserAssignmentProfileRepository(): UserAssignmentProfileRepository {
    return {
      getById: jest.fn().mockResolvedValue(null),
    };
  }

  it('updates the ticket status when the workflow allows it and writes audit', async () => {
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
        'creator-1',
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
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.IN_PROGRESS,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        status: TicketStatus.IN_PROGRESS,
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.IN_PROGRESS,
      },
    });

    expect(updateStatus).toHaveBeenCalledWith('ticket-1', {
      status: TicketStatus.IN_PROGRESS,
    });
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'agent-1',
      eventType: TicketHistoryEventType.STATUS_CHANGED,
      payload: {
        fromStatus: TicketStatus.OPEN,
        toStatus: TicketStatus.IN_PROGRESS,
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects closing a ticket directly as agent', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.IN_PROGRESS,
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
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(detail),
      } as unknown as TicketReadRepository,
      {
        updateStatus: jest.fn(),
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        status: TicketStatus.CLOSED,
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow(
      'Ticket status transition IN_PROGRESS -> CLOSED is not allowed for this role.',
    );
  });

  it('allows an admin to reopen a closed ticket', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.CLOSED,
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
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.IN_PROGRESS,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        status: TicketStatus.IN_PROGRESS,
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.IN_PROGRESS,
      },
    });
  });

  it('allows a requester to close their resolved ticket', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.RESOLVED,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'requester-1',
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
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.CLOSED,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.DEMANDEUR,
        actorUserId: 'requester-1',
        status: TicketStatus.CLOSED,
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.CLOSED,
      },
    });
  });

  it('rejects a requester status change on another user ticket', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.RESOLVED,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'requester-1',
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
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(detail),
      } as unknown as TicketReadRepository,
      {
        updateStatus: jest.fn(),
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.DEMANDEUR,
        actorUserId: 'requester-2',
        status: TicketStatus.CLOSED,
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow('You do not have access to this ticket.');
  });

  it('allows moving a ticket from in progress to pending', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-2',
        'TICK-000002',
        TicketType.INCIDENT,
        TicketStatus.IN_PROGRESS,
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
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.PENDING,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        status: TicketStatus.PENDING,
        ticketId: 'ticket-2',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.PENDING,
      },
    });
    expect(updateStatus).toHaveBeenCalledWith('ticket-2', {
      slaPausedAt: expect.any(String) as unknown as string,
      slaPausedDurationMs: 0,
      status: TicketStatus.PENDING,
    });
  });

  it('extends the resolution due date when a paused ticket resumes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-01T12:30:00.000Z'));

    const detail = new TicketDetail(
      new Ticket(
        'ticket-4',
        'TICK-000004',
        TicketType.INCIDENT,
        TicketStatus.PENDING,
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
        '2026-04-01T08:00:00.000Z',
        null,
        '2026-04-01T16:00:00.000Z',
        null,
        null,
        null,
        '2026-04-01T10:00:00.000Z',
        900000,
      ),
      null,
      null,
      null,
    );
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.IN_PROGRESS,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      createUserAssignmentProfileRepository(),
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        status: TicketStatus.IN_PROGRESS,
        ticketId: 'ticket-4',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.IN_PROGRESS,
      },
    });

    expect(updateStatus).toHaveBeenCalledWith('ticket-4', {
      resolutionDueAt: '2026-04-01T18:30:00.000Z',
      slaPausedAt: null,
      slaPausedDurationMs: 9900000,
      status: TicketStatus.IN_PROGRESS,
    });

    jest.useRealTimers();
  });

  it('rejects an agent outside the assignment group', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-3',
        'TICK-000003',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        'group-9',
        null,
        null,
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const updateStatus = jest.fn();
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(detail),
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      {
        getById: jest.fn().mockResolvedValue({
          groupId: 'group-1',
          groupIds: ['group-1'],
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        }),
      } as unknown as UserAssignmentProfileRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        status: TicketStatus.IN_PROGRESS,
        ticketId: 'ticket-3',
      }),
    ).rejects.toThrow('You do not have access to this ticket.');
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
