import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { PriorityName } from '../../../domain/ticketing/priority-name';
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
        null,
        '2026-04-01T08:00:00.000Z',
      ),
      PriorityName.MEDIUM,
      null,
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
        'service-1',
        'channel-1',
        null,
        null,
        'ci-1',
        '2026-04-01T08:00:00.000Z',
      ),
      PriorityName.MEDIUM,
      null,
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
    const useCase = new UpdateTicketUseCase(
      ticketReadRepository,
      ticketWriteRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        categoryId: 'category-2',
        channelId: 'channel-1',
        ciId: 'ci-1',
        description: 'Description mise a jour',
        requestedForUserId: 'requester-1',
        serviceId: 'service-1',
        ticketId: 'ticket-1',
        title: 'Titre mis a jour',
      }),
    ).resolves.toBe(updatedDetail);

    expect(updateTicket).toHaveBeenCalledWith('ticket-1', {
      categoryId: 'category-2',
      channelId: 'channel-1',
      ciId: 'ci-1',
      description: 'Description mise a jour',
      requestedForUserId: 'requester-1',
      serviceId: 'service-1',
      title: 'Titre mis a jour',
    });
  });

  it('rejects non admin users', async () => {
    const useCase = new UpdateTicketUseCase(
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as unknown as TicketReadRepository,
      {
        archiveClosedTicketsBefore: jest.fn(),
        createIncident: jest.fn(),
        createRequest: jest.fn(),
        deleteTicket: jest.fn(),
        updateAssignment: jest.fn(),
        updatePriority: jest.fn(),
        updateStatus: jest.fn(),
        updateTicket: jest.fn(),
      } as unknown as TicketWriteRepository,
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
    const useCase = new UpdateTicketUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(archivedDetail),
        searchTickets: jest.fn(),
      } as unknown as TicketReadRepository,
      {
        archiveClosedTicketsBefore: jest.fn(),
        createIncident: jest.fn(),
        createRequest: jest.fn(),
        deleteTicket: jest.fn(),
        updateAssignment: jest.fn(),
        updatePriority: jest.fn(),
        updateStatus: jest.fn(),
        updateTicket: jest.fn(),
      } as unknown as TicketWriteRepository,
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
    const useCase = new UpdateTicketUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(null),
        searchTickets: jest.fn(),
      } as unknown as TicketReadRepository,
      {
        archiveClosedTicketsBefore: jest.fn(),
        createIncident: jest.fn(),
        createRequest: jest.fn(),
        deleteTicket: jest.fn(),
        updateAssignment: jest.fn(),
        updatePriority: jest.fn(),
        updateStatus: jest.fn(),
        updateTicket: jest.fn(),
      } as unknown as TicketWriteRepository,
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
