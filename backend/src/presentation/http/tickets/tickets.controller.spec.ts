import { AddTicketAttachmentUseCase } from '../../../application/ticketing/use-cases/add-ticket-attachment.use-case';
import { AddTicketCommentUseCase } from '../../../application/ticketing/use-cases/add-ticket-comment.use-case';
import { AssignTicketUseCase } from '../../../application/ticketing/use-cases/assign-ticket.use-case';
import { ChangeTicketStatusUseCase } from '../../../application/ticketing/use-cases/change-ticket-status.use-case';
import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { GetTicketByIdUseCase } from '../../../application/ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketAttachmentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-attachments.use-case';
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
  const assignTicket = jest.fn().mockResolvedValue({
    ticket: {
      assignedToUserId: 'agent-1',
      assignmentGroupId: 'group-1',
      id: 'ticket-1',
    },
  });
  const changeTicketStatus = jest.fn().mockResolvedValue({
    ticket: {
      id: 'ticket-1',
      status: TicketStatus.IN_PROGRESS,
    },
  });
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
      authorUserId: 'user-1',
      body: 'Commentaire public',
      createdAt: '2026-04-02T08:10:00.000Z',
      id: 'comment-1',
      isInternal: false,
      ticketId: 'ticket-1',
    },
  ]);
  const addComment = jest.fn().mockResolvedValue({
    authorUserId: 'user-1',
    body: 'Commentaire public',
    createdAt: '2026-04-02T08:10:00.000Z',
    id: 'comment-1',
    isInternal: false,
    ticketId: 'ticket-1',
  });
  const listAttachments = jest.fn().mockResolvedValue([
    {
      bucketId: 'ticket-attachments',
      createdAt: '2026-04-02T08:15:00.000Z',
      fileName: 'test-upload.txt',
      id: 'attachment-1',
      mimeType: 'text/plain',
      sizeBytes: 21,
      storagePath: 'user-1/test-upload.txt',
      ticketId: 'ticket-1',
      uploadedByUserId: 'user-1',
    },
  ]);
  const addAttachment = jest.fn().mockResolvedValue({
    bucketId: 'ticket-attachments',
    createdAt: '2026-04-02T08:15:00.000Z',
    fileName: 'test-upload.txt',
    id: 'attachment-1',
    mimeType: 'text/plain',
    sizeBytes: 21,
    storagePath: 'user-1/test-upload.txt',
    ticketId: 'ticket-1',
    uploadedByUserId: 'user-1',
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
    assignTicket.mockClear();
    changeTicketStatus.mockClear();
    searchTickets.mockClear();
    getTicketById.mockClear();
    listComments.mockClear();
    addComment.mockClear();
    listAttachments.mockClear();
    addAttachment.mockClear();
    createIncident.mockClear();
    createRequest.mockClear();
    controller = new TicketsController(
      {
        execute: assignTicket,
      } as unknown as AssignTicketUseCase,
      {
        execute: changeTicketStatus,
      } as unknown as ChangeTicketStatusUseCase,
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
      {
        execute: listAttachments,
      } as unknown as ListTicketAttachmentsUseCase,
      {
        execute: addAttachment,
      } as unknown as AddTicketAttachmentUseCase,
    );
  });

  it('delegates ticket assignment to the dedicated use case', async () => {
    await expect(
      controller.assignTicket('ticket-1', {
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
      }),
    ).resolves.toEqual({
      ticket: {
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
        id: 'ticket-1',
      },
    });

    expect(assignTicket).toHaveBeenCalledWith({
      assignedToUserId: 'agent-1',
      assignmentGroupId: 'group-1',
      ticketId: 'ticket-1',
    });
  });

  it('delegates ticket status updates to the dedicated use case', async () => {
    await expect(
      controller.changeStatus('ticket-1', {
        status: TicketStatus.IN_PROGRESS,
      }),
    ).resolves.toEqual({
      ticket: {
        id: 'ticket-1',
        status: TicketStatus.IN_PROGRESS,
      },
    });

    expect(changeTicketStatus).toHaveBeenCalledWith({
      status: TicketStatus.IN_PROGRESS,
      ticketId: 'ticket-1',
    });
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

  it('delegates ticket comment listing with the authenticated role', async () => {
    await expect(
      controller.listComments('ticket-1', {
        accessToken: 'token',
        email: 'agent@jarvis.local',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).resolves.toEqual([
      {
        authorUserId: 'user-1',
        body: 'Commentaire public',
        createdAt: '2026-04-02T08:10:00.000Z',
        id: 'comment-1',
        isInternal: false,
        ticketId: 'ticket-1',
      },
    ]);

    expect(listComments).toHaveBeenCalledWith(
      'ticket-1',
      'user-1',
      UserRole.AGENT,
    );
  });

  it('delegates ticket comment creation with the authenticated user', async () => {
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
          body: 'Commentaire public',
          isInternal: true,
        },
      ),
    ).resolves.toEqual({
      authorUserId: 'user-1',
      body: 'Commentaire public',
      createdAt: '2026-04-02T08:10:00.000Z',
      id: 'comment-1',
      isInternal: false,
      ticketId: 'ticket-1',
    });

    expect(addComment).toHaveBeenCalledWith({
      authorRole: UserRole.AGENT,
      authorUserId: 'user-1',
      body: 'Commentaire public',
      isInternal: true,
      ticketId: 'ticket-1',
    });
  });

  it('delegates ticket attachment listing with the authenticated role', async () => {
    await expect(
      controller.listAttachments('ticket-1', {
        accessToken: 'token',
        email: 'agent@jarvis.local',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).resolves.toEqual([
      {
        bucketId: 'ticket-attachments',
        createdAt: '2026-04-02T08:15:00.000Z',
        fileName: 'test-upload.txt',
        id: 'attachment-1',
        mimeType: 'text/plain',
        sizeBytes: 21,
        storagePath: 'user-1/test-upload.txt',
        ticketId: 'ticket-1',
        uploadedByUserId: 'user-1',
      },
    ]);

    expect(listAttachments).toHaveBeenCalledWith(
      'ticket-1',
      'user-1',
      UserRole.AGENT,
    );
  });

  it('delegates ticket attachment registration with the authenticated user', async () => {
    await expect(
      controller.addAttachment(
        'ticket-1',
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          bucketId: 'ticket-attachments',
          fileName: 'test-upload.txt',
          mimeType: 'text/plain',
          sizeBytes: 21,
          storagePath: 'user-1/test-upload.txt',
        },
      ),
    ).resolves.toEqual({
      bucketId: 'ticket-attachments',
      createdAt: '2026-04-02T08:15:00.000Z',
      fileName: 'test-upload.txt',
      id: 'attachment-1',
      mimeType: 'text/plain',
      sizeBytes: 21,
      storagePath: 'user-1/test-upload.txt',
      ticketId: 'ticket-1',
      uploadedByUserId: 'user-1',
    });

    expect(addAttachment).toHaveBeenCalledWith({
      bucketId: 'ticket-attachments',
      fileName: 'test-upload.txt',
      mimeType: 'text/plain',
      sizeBytes: 21,
      storagePath: 'user-1/test-upload.txt',
      ticketId: 'ticket-1',
      uploaderRole: UserRole.AGENT,
      uploaderUserId: 'user-1',
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
          title: 'Demande acces VPN',
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
      title: 'Demande acces VPN',
    });
  });
});
