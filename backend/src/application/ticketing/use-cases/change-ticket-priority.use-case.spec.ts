import { BadRequestException } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { ChangeTicketPriorityUseCase } from './change-ticket-priority.use-case';

describe('ChangeTicketPriorityUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates priority, recalculates SLA targets and writes audit', async () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'VPN inaccessible',
      'priority-low',
      'category-1',
      'creator-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-03T09:00:00.000Z',
      '2026-04-04T09:00:00.000Z',
      '2026-04-05T09:00:00.000Z',
    );
    const ticketReadRepository: TicketReadRepository = {
      getTicketById: jest
        .fn()
        .mockResolvedValueOnce(
          new TicketDetail(ticket, PriorityName.LOW, null, null),
        )
        .mockResolvedValueOnce(
          new TicketDetail(
            new Ticket(
              ticket.id,
              ticket.number,
              ticket.type,
              ticket.status,
              ticket.title,
              ticket.description,
              'priority-high',
              ticket.categoryId,
              ticket.createdByUserId,
              ticket.requestedForUserId,
              ticket.channelId,
              ticket.assignmentGroupId,
              ticket.assignedToUserId,
              ticket.ciId,
              ticket.createdAt,
              '2026-04-03T14:00:00.000Z',
              '2026-04-03T18:00:00.000Z',
            ),
            PriorityName.HIGH,
            null,
            null,
          ),
        ),
      searchTickets: jest.fn(),
    };
    const updatePriority = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const ticketWriteRepository: TicketWriteRepository = {
      createIncident: jest.fn(),
      createRequest: jest.fn(),
      updateAssignment: jest.fn(),
      updatePriority,
      updateStatus: jest.fn(),
      updateTicket: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-high', PriorityName.HIGH, 3, 4, 8),
        ]),
    };
    const useCase = new ChangeTicketPriorityUseCase(
      ticketReadRepository,
      ticketWriteRepository,
      priorityRepository,
      { write } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        priorityId: 'priority-high',
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      priorityName: PriorityName.HIGH,
      ticket: {
        id: 'ticket-1',
        priorityId: 'priority-high',
        responseDueAt: '2026-04-03T14:00:00.000Z',
        resolutionDueAt: '2026-04-03T18:00:00.000Z',
      },
    });

    expect(updatePriority).toHaveBeenCalledWith('ticket-1', {
      priorityId: 'priority-high',
      responseDueAt: '2026-04-03T14:00:00.000Z',
      resolutionDueAt: '2026-04-03T18:00:00.000Z',
    });
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'agent-1',
      eventType: TicketHistoryEventType.PRIORITY_CHANGED,
      payload: {
        fromPriorityId: 'priority-low',
        fromResponseDueAt: '2026-04-04T09:00:00.000Z',
        fromResolutionDueAt: '2026-04-05T09:00:00.000Z',
        toPriorityId: 'priority-high',
        toResponseDueAt: '2026-04-03T14:00:00.000Z',
        toResolutionDueAt: '2026-04-03T18:00:00.000Z',
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects unknown priorities', async () => {
    const ticketReadRepository: TicketReadRepository = {
      getTicketById: jest
        .fn()
        .mockResolvedValue(
          new TicketDetail(
            new Ticket(
              'ticket-1',
              'TICK-000001',
              TicketType.INCIDENT,
              TicketStatus.OPEN,
              'VPN KO',
              'VPN inaccessible',
              'priority-low',
              'category-1',
              'creator-1',
              null,
              null,
              null,
              null,
              null,
              '2026-04-03T09:00:00.000Z',
            ),
            PriorityName.LOW,
            null,
            null,
          ),
        ),
      searchTickets: jest.fn(),
    };
    const ticketWriteRepository: TicketWriteRepository = {
      createIncident: jest.fn(),
      createRequest: jest.fn(),
      updateAssignment: jest.fn(),
      updatePriority: jest.fn(),
      updateStatus: jest.fn(),
      updateTicket: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest.fn().mockResolvedValue([]),
    };
    const useCase = new ChangeTicketPriorityUseCase(
      ticketReadRepository,
      ticketWriteRepository,
      priorityRepository,
      { write: jest.fn() } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        priorityId: 'unknown-priority',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an agent outside the assignment group', async () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'VPN inaccessible',
      'priority-low',
      'category-1',
      'creator-1',
      null,
      null,
      'group-9',
      null,
      null,
      '2026-04-03T09:00:00.000Z',
    );
    const updatePriority = jest.fn();
    const useCase = new ChangeTicketPriorityUseCase(
      {
        getTicketById: jest
          .fn()
          .mockResolvedValue(
            new TicketDetail(ticket, PriorityName.LOW, null, null),
          ),
        searchTickets: jest.fn(),
      } as unknown as TicketReadRepository,
      {
        createIncident: jest.fn(),
        createRequest: jest.fn(),
        updateAssignment: jest.fn(),
        updatePriority,
        updateStatus: jest.fn(),
        updateTicket: jest.fn(),
      } as unknown as TicketWriteRepository,
      {
        listPriorities: jest.fn(),
      } as unknown as ReferentialPriorityReadRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
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
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        priorityId: 'priority-high',
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow('You do not have access to this ticket.');
    expect(updatePriority).not.toHaveBeenCalled();
  });
});
