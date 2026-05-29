import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { AssignTicketUseCase } from './assign-ticket.use-case';

describe('AssignTicketUseCase', () => {
  it('assigns a ticket to an active agent in the assignment group and writes audit', async () => {
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
          assignedToUserId: 'agent-1',
          assignmentGroupId: 'group-1',
        },
      });
    const updateAssignment = jest.fn().mockResolvedValue(undefined);
    const getById = jest.fn().mockResolvedValue({
      groupId: 'group-2',
      groupIds: ['group-2', 'group-1'],
      id: 'agent-1',
      isActive: true,
      role: UserRole.AGENT,
    });
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new AssignTicketUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateAssignment,
      } as unknown as TicketWriteRepository,
      {
        getById,
      } as unknown as UserAssignmentProfileRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-2',
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      ticket: {
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
      },
    });

    expect(updateAssignment).toHaveBeenCalledWith('ticket-1', {
      assignedToUserId: 'agent-1',
      assignmentGroupId: 'group-1',
    });
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'agent-2',
      eventType: TicketHistoryEventType.ASSIGNED,
      payload: {
        fromAssignedToUserId: null,
        fromAssignmentGroupId: null,
        toAssignedToUserId: 'agent-1',
        toAssignmentGroupId: 'group-1',
      },
      ticketId: 'ticket-1',
    });
  });

  it('writes ASSIGNED when only a group assignment is set', async () => {
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
          assignedToUserId: null,
          assignmentGroupId: 'group-1',
        },
      });
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new AssignTicketUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateAssignment: jest.fn().mockResolvedValue(undefined),
      } as unknown as TicketWriteRepository,
      {
        getById: jest.fn(),
      } as unknown as UserAssignmentProfileRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await useCase.execute({
      actorUserId: 'agent-2',
      assignmentGroupId: 'group-1',
      ticketId: 'ticket-1',
    });

    expect(write).toHaveBeenCalledWith({
      actorUserId: 'agent-2',
      eventType: TicketHistoryEventType.ASSIGNED,
      payload: {
        fromAssignedToUserId: null,
        fromAssignmentGroupId: null,
        toAssignedToUserId: null,
        toAssignmentGroupId: 'group-1',
      },
      ticketId: 'ticket-1',
    });
  });

  it('writes UNASSIGNED when both group and assignee are cleared', async () => {
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
        'group-1',
        'agent-1',
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
          assignedToUserId: null,
          assignmentGroupId: null,
        },
      });
    const updateAssignment = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new AssignTicketUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateAssignment,
      } as unknown as TicketWriteRepository,
      {
        getById: jest.fn(),
      } as unknown as UserAssignmentProfileRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-2',
        assignedToUserId: null,
        assignmentGroupId: null,
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      ticket: {
        assignedToUserId: null,
        assignmentGroupId: null,
      },
    });

    expect(updateAssignment).toHaveBeenCalledWith('ticket-1', {
      assignedToUserId: null,
      assignmentGroupId: null,
    });
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'agent-2',
      eventType: TicketHistoryEventType.UNASSIGNED,
      payload: {
        fromAssignedToUserId: 'agent-1',
        fromAssignmentGroupId: 'group-1',
        toAssignedToUserId: null,
        toAssignmentGroupId: null,
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects an invalid assignment policy', async () => {
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
    const useCase = new AssignTicketUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(detail),
      } as unknown as TicketReadRepository,
      {
        updateAssignment: jest.fn(),
      } as unknown as TicketWriteRepository,
      {
        getById: jest.fn().mockResolvedValue({
          groupId: 'group-2',
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
        actorUserId: 'agent-2',
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow('Assigned user must belong to the assignment group.');
  });
});
