import { UserRole } from '../../domain/auth/user-role';
import { NotificationType } from '../../domain/notifications/notification-type';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../ticketing/repositories/ticket-read.repository';
import {
  type CreateNotificationRecord,
  NotificationRepository,
} from './repositories/notification.repository';
import { TicketNotificationService } from './ticket-notification.service';

describe('TicketNotificationService', () => {
  const ticketDetail = new TicketDetail(
    new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.IN_PROGRESS,
      'VPN indisponible',
      'Le VPN ne répond plus.',
      'priority-1',
      'category-1',
      'requester-1',
      null,
      null,
      'group-1',
      'agent-2',
      null,
      '2026-06-23T10:00:00.000Z',
    ),
    null,
    null,
    null,
  );
  const users = [
    buildUser('requester-1', UserRole.DEMANDEUR, []),
    buildUser('agent-1', UserRole.AGENT, ['group-1']),
    buildUser('agent-2', UserRole.AGENT, ['group-1']),
    buildUser('admin-1', UserRole.ADMIN, ['group-1']),
  ];

  it('notifies ticket stakeholders about a public comment except the actor', async () => {
    let createdRecords: CreateNotificationRecord[] = [];
    const createMany = jest.fn(
      (records: CreateNotificationRecord[]): Promise<void> => {
        createdRecords = records;

        return Promise.resolve();
      },
    );
    const service = buildService(createMany);

    await service.notify({
      actorUserId: 'agent-1',
      eventType: TicketHistoryEventType.COMMENT_ADDED,
      payload: { isInternal: false },
      ticketId: 'ticket-1',
    });

    expect(createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          recipientUserId: 'requester-1',
          type: NotificationType.TICKET_COMMENTED,
        }),
        expect.objectContaining({ recipientUserId: 'agent-2' }),
      ]),
    );
    expect(createdRecords).toHaveLength(2);
  });

  it('ignores internal comment notifications', async () => {
    let createdRecords: CreateNotificationRecord[] = [];
    const createMany = jest.fn(
      (records: CreateNotificationRecord[]): Promise<void> => {
        createdRecords = records;

        return Promise.resolve();
      },
    );
    const service = buildService(createMany);

    await service.notify({
      actorUserId: 'agent-1',
      eventType: TicketHistoryEventType.COMMENT_ADDED,
      payload: { isInternal: true },
      ticketId: 'ticket-1',
    });

    expect(createdRecords).toEqual([]);
  });

  it('notifies only the assigned agent about an assignment', async () => {
    let createdRecords: CreateNotificationRecord[] = [];
    const createMany = jest.fn(
      (records: CreateNotificationRecord[]): Promise<void> => {
        createdRecords = records;

        return Promise.resolve();
      },
    );
    const service = buildService(createMany);

    await service.notify({
      actorUserId: 'admin-1',
      eventType: TicketHistoryEventType.ASSIGNED,
      ticketId: 'ticket-1',
    });

    expect(createdRecords.map((record) => record.recipientUserId)).toEqual([
      'agent-2',
    ]);
    expect(createdRecords[0]?.type).toBe(NotificationType.TICKET_ASSIGNED);
  });

  it('notifies group admins about an assignment when no agent is assigned', async () => {
    const unassignedGroupTicket = new TicketDetail(
      new Ticket(
        'ticket-3',
        'TICK-000003',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'Incident réseau',
        'Connexion indisponible.',
        'priority-1',
        'category-1',
        'requester-1',
        null,
        null,
        'group-1',
        null,
        null,
        '2026-06-23T12:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    let createdRecords: CreateNotificationRecord[] = [];
    const createMany = jest.fn(
      (records: CreateNotificationRecord[]): Promise<void> => {
        createdRecords = records;

        return Promise.resolve();
      },
    );
    const service = buildService(createMany, unassignedGroupTicket);

    await service.notify({
      actorUserId: 'agent-1',
      eventType: TicketHistoryEventType.ASSIGNED,
      ticketId: 'ticket-3',
    });

    expect(createdRecords.map((record) => record.recipientUserId)).toEqual([
      'admin-1',
    ]);
  });

  it('notifies active support users when an unassigned ticket is created', async () => {
    const unassignedTicket = new TicketDetail(
      new Ticket(
        'ticket-2',
        'TICK-000002',
        TicketType.REQUEST,
        TicketStatus.OPEN,
        'Nouvel accès',
        'Création d’un accès.',
        'priority-1',
        'category-1',
        'requester-1',
        null,
        null,
        null,
        null,
        null,
        '2026-06-23T11:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    let createdRecords: CreateNotificationRecord[] = [];
    const createMany = jest.fn(
      (records: CreateNotificationRecord[]): Promise<void> => {
        createdRecords = records;

        return Promise.resolve();
      },
    );
    const service = buildService(createMany, unassignedTicket);

    await service.notify({
      actorUserId: 'requester-1',
      eventType: TicketHistoryEventType.CREATED,
      ticketId: 'ticket-2',
    });

    expect(
      createdRecords.map((record) => record.recipientUserId).sort(),
    ).toEqual(['admin-1']);
    expect(createdRecords[0]?.type).toBe(NotificationType.TICKET_CREATED);
  });

  it('notifies the requested user when a ticket is created for someone else', async () => {
    const ticketCreatedForRequester = new TicketDetail(
      new Ticket(
        'ticket-4',
        'TICK-000004',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'Poste bloque',
        'Le poste ne demarre plus.',
        'priority-1',
        'category-1',
        'admin-1',
        'requester-1',
        null,
        'group-1',
        null,
        null,
        '2026-06-23T13:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    let createdRecords: CreateNotificationRecord[] = [];
    const createMany = jest.fn(
      (records: CreateNotificationRecord[]): Promise<void> => {
        createdRecords = records;

        return Promise.resolve();
      },
    );
    const service = buildService(createMany, ticketCreatedForRequester);

    await service.notify({
      actorUserId: 'admin-1',
      eventType: TicketHistoryEventType.CREATED,
      ticketId: 'ticket-4',
    });

    expect(createdRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientUserId: 'requester-1',
          title: 'Ticket créé pour vous',
        }),
        expect.objectContaining({
          recipientUserId: 'agent-1',
          title: 'Nouveau ticket',
        }),
        expect.objectContaining({
          recipientUserId: 'agent-2',
          title: 'Nouveau ticket',
        }),
      ]),
    );
    expect(
      createdRecords.some((record) => record.recipientUserId === 'admin-1'),
    ).toBe(false);
  });

  function buildService(
    createMany: (records: CreateNotificationRecord[]) => Promise<void>,
    detail: TicketDetail = ticketDetail,
  ): TicketNotificationService {
    return new TicketNotificationService(
      {
        createMany,
        listActiveRecipients: jest.fn().mockResolvedValue(users),
      } as unknown as NotificationRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(detail),
      } as unknown as TicketReadRepository,
    );
  }
});

function buildUser(id: string, role: UserRole, groupIds: string[]) {
  return {
    displayName: id,
    email: `${id}@jarvis.fr`,
    firstName: null,
    groupId: groupIds[0] ?? null,
    groupIds,
    id,
    lastName: null,
    role,
  };
}
