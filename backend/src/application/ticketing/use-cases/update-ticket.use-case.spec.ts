import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { UserRole } from '../../../domain/auth/user-role';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { Incident } from '../../../domain/ticketing/incident';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestApprovalStatus } from '../../../domain/ticketing/request-approval-status';
import { RequestTicket } from '../../../domain/ticketing/request';
import { RequestType } from '../../../domain/ticketing/request-type';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { UpdateTicketUseCase } from './update-ticket.use-case';

describe('UpdateTicketUseCase', () => {
  it('updates a ticket for admins and reloads the detail', async () => {
    const existingDetail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'Titre initial',
        'Description initiale',
        'priority-medium',
        'category-1',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-01T08:00:00.000Z',
      ),
      PriorityName.MEDIUM,
      new Incident(
        'ticket-1',
        IncidentSeverity.HIGH,
        IncidentSeverity.MEDIUM,
        null,
        null,
      ),
      null,
    );
    const updatedDetail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'Titre mis a jour',
        'Description mise a jour',
        'priority-medium',
        'category-2',
        'user-1',
        'requester-1',
        'channel-1',
        null,
        null,
        'ci-1',
        '2026-04-01T08:00:00.000Z',
        '2026-04-01T12:00:00.000Z',
        '2026-04-01T20:00:00.000Z',
      ),
      PriorityName.CRITICAL,
      new Incident(
        'ticket-1',
        IncidentSeverity.HIGH,
        IncidentSeverity.HIGH,
        'Analyse terminee',
        'Escalade N3',
      ),
      null,
    );
    const updateTicket = jest.fn().mockResolvedValue(undefined);
    const ticketReadRepository: TicketReadRepository = {
      getTicketById: jest
        .fn()
        .mockResolvedValueOnce(existingDetail)
        .mockResolvedValueOnce(updatedDetail),
      searchTickets: jest.fn(),
    };
    const ticketWriteRepository: TicketWriteRepository = {
      archiveClosedTicketsBefore: jest.fn(),
      createIncident: jest.fn(),
      createRequest: jest.fn(),
      deleteTicket: jest.fn(),
      updateAssignment: jest.fn(),
      updatePriority: jest.fn(),
      updateStatus: jest.fn(),
      updateTicket,
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority(
            'priority-medium',
            PriorityName.MEDIUM,
            2,
            8,
            24,
          ),
          new ReferentialPriority(
            'priority-critical',
            PriorityName.CRITICAL,
            4,
            4,
            12,
          ),
        ]),
    };
    const useCase = new UpdateTicketUseCase(
      ticketReadRepository,
      ticketWriteRepository,
      priorityRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        categoryId: 'category-2',
        channelId: 'channel-1',
        ciId: 'ci-1',
        description: 'Description mise a jour',
        impact: IncidentSeverity.HIGH,
        requestedForUserId: 'requester-1',
        rootCause: 'Analyse terminee',
        ticketId: 'ticket-1',
        title: 'Titre mis a jour',
        urgency: IncidentSeverity.HIGH,
        workaround: 'Escalade N3',
      }),
    ).resolves.toBe(updatedDetail);

    expect(updateTicket).toHaveBeenCalledWith('ticket-1', {
      categoryId: 'category-2',
      channelId: 'channel-1',
      ciId: 'ci-1',
      description: 'Description mise a jour',
      incident: {
        impact: IncidentSeverity.HIGH,
        rootCause: 'Analyse terminee',
        urgency: IncidentSeverity.HIGH,
        workaround: 'Escalade N3',
      },
      priorityId: 'priority-critical',
      requestedForUserId: 'requester-1',
      resolutionDueAt: expect.any(String) as unknown as string,
      responseDueAt: expect.any(String) as unknown as string,
      title: 'Titre mis a jour',
    });
  });

  it('preserves priority and SLA targets when updating a request', async () => {
    const responseDueAt = '2026-04-01T12:00:00.000Z';
    const resolutionDueAt = '2026-04-01T20:00:00.000Z';
    const existingDetail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.REQUEST,
        TicketStatus.IN_PROGRESS,
        'Demande initiale',
        'Description initiale',
        'priority-medium',
        'category-1',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-01T08:00:00.000Z',
        responseDueAt,
        resolutionDueAt,
      ),
      PriorityName.MEDIUM,
      null,
      new RequestTicket(
        'ticket-1',
        RequestType.OTHER,
        RequestApprovalStatus.PENDING,
        null,
      ),
    );
    const updatedDetail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.REQUEST,
        TicketStatus.IN_PROGRESS,
        'Demande mise a jour',
        'Description mise a jour',
        'priority-medium',
        'category-2',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-01T08:00:00.000Z',
        responseDueAt,
        resolutionDueAt,
      ),
      PriorityName.MEDIUM,
      null,
      existingDetail.request,
    );
    const updateTicket = jest.fn().mockResolvedValue(undefined);
    const useCase = new UpdateTicketUseCase(
      {
        getTicketById: jest
          .fn()
          .mockResolvedValueOnce(existingDetail)
          .mockResolvedValueOnce(updatedDetail),
        searchTickets: jest.fn(),
      },
      {
        archiveClosedTicketsBefore: jest.fn(),
        createIncident: jest.fn(),
        createRequest: jest.fn(),
        deleteTicket: jest.fn(),
        updateAssignment: jest.fn(),
        updatePriority: jest.fn(),
        updateStatus: jest.fn(),
        updateTicket,
      },
      {
        listPriorities: jest.fn(),
      },
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        categoryId: 'category-2',
        description: 'Description mise a jour',
        ticketId: 'ticket-1',
        title: 'Demande mise a jour',
      }),
    ).resolves.toBe(updatedDetail);

    expect(updateTicket).toHaveBeenCalledWith('ticket-1', {
      categoryId: 'category-2',
      channelId: null,
      ciId: null,
      description: 'Description mise a jour',
      incident: undefined,
      priorityId: 'priority-medium',
      requestedForUserId: null,
      resolutionDueAt,
      responseDueAt,
      title: 'Demande mise a jour',
    });
  });

  it('rejects non admin users', async () => {
    const ticketReadRepository: TicketReadRepository = {
      getTicketById: jest.fn(),
      searchTickets: jest.fn(),
    };
    const ticketWriteRepository: TicketWriteRepository = {
      archiveClosedTicketsBefore: jest.fn(),
      createIncident: jest.fn(),
      createRequest: jest.fn(),
      deleteTicket: jest.fn(),
      updateAssignment: jest.fn(),
      updatePriority: jest.fn(),
      updateStatus: jest.fn(),
      updateTicket: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest.fn(),
    };
    const useCase = new UpdateTicketUseCase(
      ticketReadRepository,
      ticketWriteRepository,
      priorityRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        categoryId: 'category-1',
        description: 'Description',
        ticketId: 'ticket-1',
        title: 'Titre',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects archived tickets', async () => {
    const archivedDetail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.CLOSED,
        'Titre',
        'Description',
        'priority-medium',
        'category-1',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-01T08:00:00.000Z',
        null,
        null,
        null,
        null,
        '2026-06-01T08:00:00.000Z',
      ),
      PriorityName.MEDIUM,
      null,
      null,
    );
    const ticketReadRepository: TicketReadRepository = {
      getTicketById: jest.fn().mockResolvedValue(archivedDetail),
      searchTickets: jest.fn(),
    };
    const ticketWriteRepository: TicketWriteRepository = {
      archiveClosedTicketsBefore: jest.fn(),
      createIncident: jest.fn(),
      createRequest: jest.fn(),
      deleteTicket: jest.fn(),
      updateAssignment: jest.fn(),
      updatePriority: jest.fn(),
      updateStatus: jest.fn(),
      updateTicket: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest.fn(),
    };
    const useCase = new UpdateTicketUseCase(
      ticketReadRepository,
      ticketWriteRepository,
      priorityRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        categoryId: 'category-1',
        description: 'Description',
        ticketId: 'ticket-1',
        title: 'Titre',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown tickets', async () => {
    const ticketReadRepository: TicketReadRepository = {
      getTicketById: jest.fn().mockResolvedValue(null),
      searchTickets: jest.fn(),
    };
    const ticketWriteRepository: TicketWriteRepository = {
      archiveClosedTicketsBefore: jest.fn(),
      createIncident: jest.fn(),
      createRequest: jest.fn(),
      deleteTicket: jest.fn(),
      updateAssignment: jest.fn(),
      updatePriority: jest.fn(),
      updateStatus: jest.fn(),
      updateTicket: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest.fn(),
    };
    const useCase = new UpdateTicketUseCase(
      ticketReadRepository,
      ticketWriteRepository,
      priorityRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        categoryId: 'category-1',
        description: 'Description',
        ticketId: 'ticket-1',
        title: 'Titre',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
