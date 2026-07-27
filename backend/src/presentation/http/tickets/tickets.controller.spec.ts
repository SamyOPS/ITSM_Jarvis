import { AddTicketAttachmentUseCase } from '../../../application/ticketing/use-cases/add-ticket-attachment.use-case';
import { AddTicketCommentUseCase } from '../../../application/ticketing/use-cases/add-ticket-comment.use-case';
import { ArchiveExpiredTicketsUseCase } from '../../../application/ticketing/use-cases/archive-expired-tickets.use-case';
import { AssignTicketUseCase } from '../../../application/ticketing/use-cases/assign-ticket.use-case';
import { ChangeTicketPriorityUseCase } from '../../../application/ticketing/use-cases/change-ticket-priority.use-case';
import { ChangeTicketStatusUseCase } from '../../../application/ticketing/use-cases/change-ticket-status.use-case';
import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { DeleteTicketAttachmentUseCase } from '../../../application/ticketing/use-cases/delete-ticket-attachment.use-case';
import { DeleteTicketCommentUseCase } from '../../../application/ticketing/use-cases/delete-ticket-comment.use-case';
import { DeleteTicketUseCase } from '../../../application/ticketing/use-cases/delete-ticket.use-case';
import { GetTicketByIdUseCase } from '../../../application/ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketAttachmentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-attachments.use-case';
import { ListTicketCommentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-comments.use-case';
import { ListTicketHistoryUseCase } from '../../../application/ticketing/use-cases/list-ticket-history.use-case';
import { SearchTicketsUseCase } from '../../../application/ticketing/use-cases/search-tickets.use-case';
import { SuggestTicketDraftUseCase } from '../../../application/ticketing/use-cases/suggest-ticket-draft.use-case';
import { UpdateTicketUseCase } from '../../../application/ticketing/use-cases/update-ticket.use-case';
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
  const changeTicketPriority = jest.fn().mockResolvedValue({
    ticket: {
      id: 'ticket-1',
      priorityId: 'priority-high',
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
  const suggestTicketDraft = jest.fn().mockResolvedValue({
    action: 'ASK_QUESTION',
    question: 'Pouvez-vous apporter une precision supplementaire ?',
    suggestion: null,
  });
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
  const listHistory = jest.fn().mockResolvedValue([
    {
      actorUserId: 'user-1',
      createdAt: '2026-04-02T08:20:00.000Z',
      eventType: 'STATUS_CHANGED',
      id: 'history-1',
      payload: {
        fromStatus: TicketStatus.OPEN,
        toStatus: TicketStatus.IN_PROGRESS,
      },
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
  const archiveExpiredTickets = jest.fn().mockResolvedValue({
    archivedCount: 1,
    cutoff: '2026-02-16T10:00:00.000Z',
  });
  const deleteComment = jest.fn().mockResolvedValue(undefined);
  const deleteTicket = jest.fn().mockResolvedValue(undefined);
  const updateTicket = jest.fn().mockResolvedValue({
    priorityName: 'HIGH',
    ticket: { id: 'ticket-1', title: 'Titre modifie' },
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
  const deleteAttachment = jest.fn().mockResolvedValue(undefined);
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
    changeTicketPriority.mockClear();
    searchTickets.mockClear();
    suggestTicketDraft.mockClear();
    getTicketById.mockClear();
    listComments.mockClear();
    listHistory.mockClear();
    addComment.mockClear();
    archiveExpiredTickets.mockClear();
    deleteComment.mockClear();
    deleteTicket.mockClear();
    updateTicket.mockClear();
    listAttachments.mockClear();
    addAttachment.mockClear();
    deleteAttachment.mockClear();
    createIncident.mockClear();
    createRequest.mockClear();
    controller = new TicketsController(
      {
        execute: assignTicket,
      } as unknown as AssignTicketUseCase,
      {
        execute: archiveExpiredTickets,
      } as unknown as ArchiveExpiredTicketsUseCase,
      {
        execute: changeTicketPriority,
      } as unknown as ChangeTicketPriorityUseCase,
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
        execute: suggestTicketDraft,
      } as unknown as SuggestTicketDraftUseCase,
      {
        execute: getTicketById,
      } as unknown as GetTicketByIdUseCase,
      {
        execute: listComments,
      } as unknown as ListTicketCommentsUseCase,
      {
        execute: listHistory,
      } as unknown as ListTicketHistoryUseCase,
      {
        execute: addComment,
      } as unknown as AddTicketCommentUseCase,
      {
        execute: deleteComment,
      } as unknown as DeleteTicketCommentUseCase,
      {
        execute: listAttachments,
      } as unknown as ListTicketAttachmentsUseCase,
      {
        execute: addAttachment,
      } as unknown as AddTicketAttachmentUseCase,
      {
        execute: deleteAttachment,
      } as unknown as DeleteTicketAttachmentUseCase,
      {
        execute: deleteTicket,
      } as unknown as DeleteTicketUseCase,
      {
        execute: updateTicket,
      } as unknown as UpdateTicketUseCase,
    );
  });

  it('delegates ticket assignment to the dedicated use case', async () => {
    await expect(
      controller.assignTicket(
        'ticket-1',
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          assignedToUserId: 'agent-1',
          assignmentGroupId: 'group-1',
        },
      ),
    ).resolves.toEqual({
      ticket: {
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
        id: 'ticket-1',
      },
    });

    expect(assignTicket).toHaveBeenCalledWith({
      actorRole: UserRole.AGENT,
      actorUserId: 'user-1',
      assignedToUserId: 'agent-1',
      assignmentGroupId: 'group-1',
      ticketId: 'ticket-1',
    });
  });

  it('delegates ticket status updates to the dedicated use case', async () => {
    await expect(
      controller.changeStatus(
        'ticket-1',
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          status: TicketStatus.IN_PROGRESS,
        },
      ),
    ).resolves.toEqual({
      ticket: {
        id: 'ticket-1',
        status: TicketStatus.IN_PROGRESS,
      },
    });

    expect(changeTicketStatus).toHaveBeenCalledWith({
      actorRole: UserRole.AGENT,
      actorUserId: 'user-1',
      status: TicketStatus.IN_PROGRESS,
      ticketId: 'ticket-1',
    });
  });

  it('delegates ticket priority updates to the dedicated use case', async () => {
    await expect(
      controller.changePriority(
        'ticket-1',
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          priorityId: 'priority-high',
        },
      ),
    ).resolves.toEqual({
      ticket: {
        id: 'ticket-1',
        priorityId: 'priority-high',
      },
    });

    expect(changeTicketPriority).toHaveBeenCalledWith({
      actorRole: UserRole.AGENT,
      actorUserId: 'user-1',
      priorityId: 'priority-high',
      ticketId: 'ticket-1',
    });
  });

  it('delegates ticket content updates to the dedicated use case', async () => {
    await expect(
      controller.updateTicket(
        'ticket-1',
        {
          accessToken: 'token',
          email: 'admin@jarvis.local',
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
        {
          categoryId: 'category-2',
          channelId: 'channel-1',
          ciId: 'ci-1',
          description: 'Description mise a jour',
          requestedForUserId: 'requester-1',
          title: 'Titre modifie',
        },
      ),
    ).resolves.toEqual({
      priorityName: 'HIGH',
      ticket: { id: 'ticket-1', title: 'Titre modifie' },
    });

    expect(updateTicket).toHaveBeenCalledWith({
      actorRole: UserRole.ADMIN,
      actorUserId: 'admin-1',
      categoryId: 'category-2',
      channelId: 'channel-1',
      ciId: 'ci-1',
      description: 'Description mise a jour',
      impact: null,
      requestedForUserId: 'requester-1',
      rootCause: null,
      ticketId: 'ticket-1',
      title: 'Titre modifie',
      urgency: null,
      workaround: null,
    });
  });

  it('delegates ticket search to the dedicated use case', async () => {
    await expect(
      controller.listTickets(
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          q: 'vpn',
          status: TicketStatus.OPEN,
          type: TicketType.INCIDENT,
        },
      ),
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
      includeArchived: false,
      requesterUserId: 'user-1',
      requesterUserRole: UserRole.AGENT,
      q: 'vpn',
      status: TicketStatus.OPEN,
      type: TicketType.INCIDENT,
    });
  });

  it('delegates ticket detail loading to the dedicated use case', async () => {
    await expect(
      controller.getTicketById('ticket-1', {
        accessToken: 'token',
        email: 'demandeur@jarvis.local',
        id: 'user-1',
        role: UserRole.DEMANDEUR,
      }),
    ).resolves.toEqual({
      priorityName: 'HIGH',
      ticket: { id: 'ticket-1', number: 'TICK-000001' },
    });

    expect(getTicketById).toHaveBeenCalledWith({
      requesterUserId: 'user-1',
      requesterUserRole: UserRole.DEMANDEUR,
      ticketId: 'ticket-1',
    });
  });

  it('delegates ticket deletion with the authenticated admin', async () => {
    await expect(
      controller.deleteTicket('ticket-1', {
        accessToken: 'token',
        email: 'admin@jarvis.local',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toBeUndefined();

    expect(deleteTicket).toHaveBeenCalledWith({
      actorRole: UserRole.ADMIN,
      actorUserId: 'admin-1',
      ticketId: 'ticket-1',
    });
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

  it('delegates ticket history listing with the authenticated role', async () => {
    await expect(
      controller.listHistory('ticket-1', {
        accessToken: 'token',
        email: 'agent@jarvis.local',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).resolves.toEqual([
      {
        actorUserId: 'user-1',
        createdAt: '2026-04-02T08:20:00.000Z',
        eventType: 'STATUS_CHANGED',
        id: 'history-1',
        payload: {
          fromStatus: TicketStatus.OPEN,
          toStatus: TicketStatus.IN_PROGRESS,
        },
        ticketId: 'ticket-1',
      },
    ]);

    expect(listHistory).toHaveBeenCalledWith(
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

  it('delegates ticket comment deletion with the authenticated user', async () => {
    await expect(
      controller.deleteComment('ticket-1', 'comment-1', {
        accessToken: 'token',
        email: 'agent@jarvis.local',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).resolves.toBeUndefined();

    expect(deleteComment).toHaveBeenCalledWith({
      actorRole: UserRole.AGENT,
      actorUserId: 'user-1',
      commentId: 'comment-1',
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

  it('delegates ticket attachment deletion with the authenticated user', async () => {
    await expect(
      controller.deleteAttachment('ticket-1', 'attachment-1', {
        accessToken: 'token',
        email: 'agent@jarvis.local',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).resolves.toBeUndefined();

    expect(deleteAttachment).toHaveBeenCalledWith({
      actorRole: UserRole.AGENT,
      actorUserId: 'user-1',
      attachmentId: 'attachment-1',
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
      creatorRole: UserRole.AGENT,
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
      creatorRole: UserRole.AGENT,
      createdByUserId: 'user-1',
      description: 'Besoin d un acces VPN',
      priorityId: 'priority-medium',
      requestType: RequestType.ACCESS,
      title: 'Demande acces VPN',
    });
  });
});
