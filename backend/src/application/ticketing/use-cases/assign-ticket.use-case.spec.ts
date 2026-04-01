import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { AssignTicketUseCase } from './assign-ticket.use-case';

describe('AssignTicketUseCase', () => {
  it('assigns a ticket to an active agent in the assignment group', async () => {
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
      groupId: 'group-1',
      id: 'agent-1',
      isActive: true,
      role: UserRole.AGENT,
    });
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
    );

    await expect(
      useCase.execute({
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
    );

    await expect(
      useCase.execute({
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow('Assigned user must belong to the assignment group.');
  });
});
