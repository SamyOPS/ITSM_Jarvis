import { AddTicketCommentUseCase } from '../../../application/ticketing/use-cases/add-ticket-comment.use-case';
import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { GetTicketByIdUseCase } from '../../../application/ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketCommentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-comments.use-case';
import { SearchTicketsUseCase } from '../../../application/ticketing/use-cases/search-tickets.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { RequestType } from '../../../domain/ticketing/request-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;
  const searchTickets = jest.fn().mockResolvedValue([
    {
      id: 'ticket-1',
      number: 'TICK-000001',
      status: TicketStatus.OPEN,
      title: 'VPN KO',
      type: TicketType.INCIDENT,
    },
  ]);
  const getTicketById = jest.fn().mockResolvedValue({
    priorityName: 'HIGH',
    ticket: { id: 'ticket-1', number: 'TICK-000001' },
  });
  const listComments = jest.fn().mockResolvedValue([
    {
      authorUserId: 'agent-1',
      body: 'Analyse en cours',
      createdAt: '2026-04-01T10:00:00.000Z',
      id: 'comment-1',
      isInternal: true,
      ticketId: 'ticket-1',
    },
  ]);
  const addComment = jest.fn().mockResolvedValue({
    authorUserId: 'agent-1',
    body: 'Analyse en cours',
    createdAt: '2026-04-01T10:00:00.000Z',
    id: 'comment-1',
    isInternal: true,
    ticketId: 'ticket-1',
  });
  const createIncident = jest.fn().mockResolvedValue({
    incident: {
      impact: IncidentSeverity.HIGH,
      urgency: IncidentSeverity.MEDIUM,
    },
    priorityName: 'HIGH',
    ticket: { id: 'ticket-1', number: 'TICK-000001' },
  });
  const createRequest = jest.fn().mockResolvedValue({
    priorityName: 'MEDIUM',
    request: {
      approvalStatus: null,
      fulfilledAt: null,
      requestType: RequestType.ACCESS,
      ticketId: 'ticket-2',
    },
    ticket: { id: 'ticket-2', number: 'TICK-000002' },
  });

  beforeEach(() => {
    searchTickets.mockClear();
    getTicketById.mockClear();
    listComments.mockClear();
    addComment.mockClear();
    createIncident.mockClear();
    createRequest.mockClear();
    controller = new TicketsController(
      {
        execute: createIncident,
      } as unknown as CreateIncidentUseCase,
      {
        execute: createRequest,
      } as unknown as CreateRequestUseCase,
      {
        execute: searchTickets,
      } as unknown as SearchTicketsUseCase,
      {
        execute: getTicketById,
      } as unknown as GetTicketByIdUseCase,
      {
        execute: listComments,
      } as unknown as ListTicketCommentsUseCase,
      {
        execute: addComment,
      } as unknown as AddTicketCommentUseCase,
    );
  });

  it('delegates ticket search to the dedicated use case', async () => {
    await expect(
      controller.listTickets({
        q: 'vpn',
        status: TicketStatus.OPEN,
        type: TicketType.INCIDENT,
      }),
    ).resolves.toEqual([
      {
        id: 'ticket-1',
        number: 'TICK-000001',
        status: TicketStatus.OPEN,
        title: 'VPN KO',
        type: TicketType.INCIDENT,
      },
    ]);

    expect(searchTickets).toHaveBeenCalledWith({
      q: 'vpn',
      status: TicketStatus.OPEN,
      type: TicketType.INCIDENT,
    });
  });

  it('delegates ticket detail loading to the dedicated use case', async () => {
    await expect(controller.getTicketById('ticket-1')).resolves.toEqual({
      priorityName: 'HIGH',
      ticket: { id: 'ticket-1', number: 'TICK-000001' },
    });

    expect(getTicketById).toHaveBeenCalledWith('ticket-1');
  });

  it('delegates ticket comment listing with the authenticated user role', async () => {
    await expect(
      controller.listComments('ticket-1', {
        accessToken: 'token',
        email: 'agent@jarvis.local',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).resolves.toEqual([
      {
        authorUserId: 'agent-1',
        body: 'Analyse en cours',
        createdAt: '2026-04-01T10:00:00.000Z',
        id: 'comment-1',
        isInternal: true,
        ticketId: 'ticket-1',
      },
    ]);

    expect(listComments).toHaveBeenCalledWith('ticket-1', UserRole.AGENT);
  });

  it('delegates ticket comment creation with the authenticated user context', async () => {
    await expect(
      controller.addComment(
        'ticket-1',
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          body: 'Analyse en cours',
          isInternal: true,
        },
      ),
    ).resolves.toEqual({
      authorUserId: 'agent-1',
      body: 'Analyse en cours',
      createdAt: '2026-04-01T10:00:00.000Z',
      id: 'comment-1',
      isInternal: true,
      ticketId: 'ticket-1',
    });

    expect(addComment).toHaveBeenCalledWith({
      authorRole: UserRole.AGENT,
      authorUserId: 'user-1',
      body: 'Analyse en cours',
      isInternal: true,
      ticketId: 'ticket-1',
    });
  });

  it('delegates incident creation to the use case with the authenticated user id', async () => {
    await expect(
      controller.createIncident(
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          categoryId: 'category-1',
          description: 'VPN inaccessible',
          impact: IncidentSeverity.HIGH,
          title: 'VPN KO',
          urgency: IncidentSeverity.MEDIUM,
        },
      ),
    ).resolves.toEqual({
      incident: {
        impact: IncidentSeverity.HIGH,
        urgency: IncidentSeverity.MEDIUM,
      },
      priorityName: 'HIGH',
      ticket: { id: 'ticket-1', number: 'TICK-000001' },
    });

    expect(createIncident).toHaveBeenCalledWith({
      categoryId: 'category-1',
      createdByUserId: 'user-1',
      description: 'VPN inaccessible',
      impact: IncidentSeverity.HIGH,
      title: 'VPN KO',
      urgency: IncidentSeverity.MEDIUM,
    });
  });

  it('delegates request creation to the use case with the authenticated user id', async () => {
    await expect(
      controller.createRequest(
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          categoryId: 'category-1',
          description: 'Besoin d un acces VPN',
          priorityId: 'priority-medium',
          requestType: RequestType.ACCESS,
          title: 'Demande accès VPN',
        },
      ),
    ).resolves.toEqual({
      priorityName: 'MEDIUM',
      request: {
        approvalStatus: null,
        fulfilledAt: null,
        requestType: RequestType.ACCESS,
        ticketId: 'ticket-2',
      },
      ticket: { id: 'ticket-2', number: 'TICK-000002' },
    });

    expect(createRequest).toHaveBeenCalledWith({
      categoryId: 'category-1',
      createdByUserId: 'user-1',
      description: 'Besoin d un acces VPN',
      priorityId: 'priority-medium',
      requestType: RequestType.ACCESS,
      title: 'Demande accès VPN',
    });
  });
});
