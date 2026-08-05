import { Inject, Injectable } from '@nestjs/common';
import { isAdminRole, isSupportRole } from '../../domain/auth/user-role';
import { NotificationType } from '../../domain/notifications/notification-type';
import { TicketHistoryEventType } from '../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../ticketing/repositories/ticket-read.repository';
import { type CreateTicketHistoryRecord } from '../ticketing/repositories/ticket-history-write.repository';
import {
  type CreateNotificationRecord,
  NotificationRepository,
} from './repositories/notification.repository';

@Injectable()
export class TicketNotificationService {
  constructor(
    @Inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async notify(record: CreateTicketHistoryRecord): Promise<void> {
    if (!isNotifiableEvent(record.eventType)) {
      return;
    }

    const ticketDetail = await this.ticketReadRepository.getTicketById(
      record.ticketId,
    );

    if (!ticketDetail) {
      return;
    }

    const users = await this.notificationRepository.listActiveRecipients();
    const ticket = ticketDetail.ticket;
    const ticketDisplayNumber = formatTicketDisplayNumber(
      ticket.type,
      ticket.number,
    );
    const activeUserIds = new Set(users.map((user) => user.id));
    const requesterIds = new Set(
      [ticket.createdByUserId, ticket.requestedForUserId]
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => activeUserIds.has(userId)),
    );
    const adminIds = new Set(
      users.filter((user) => isAdminRole(user.role)).map((user) => user.id),
    );
    const assignedSupportIds =
      ticket.assignedToUserId && activeUserIds.has(ticket.assignedToUserId)
        ? new Set([ticket.assignedToUserId])
        : new Set<string>();
    const groupAdminIds = new Set(
      users
        .filter(
          (user) =>
            isAdminRole(user.role) &&
            Boolean(ticket.assignmentGroupId) &&
            user.groupIds.includes(ticket.assignmentGroupId as string),
        )
        .map((user) => user.id),
    );
    const groupSupportIds = new Set<string>();

    if (ticket.assignmentGroupId) {
      for (const user of users) {
        if (
          isSupportRole(user.role) &&
          user.groupIds.includes(ticket.assignmentGroupId)
        ) {
          groupSupportIds.add(user.id);
        }
      }
    }

    const createdSupportIds = resolveSupportRecipientIds(
      ticket.assignedToUserId,
      activeUserIds,
      groupSupportIds,
      adminIds,
    );
    const assignmentRecipientIds =
      assignedSupportIds.size > 0 ? assignedSupportIds : groupAdminIds;

    if (record.eventType === TicketHistoryEventType.CREATED) {
      await this.notificationRepository.createMany(
        buildTicketCreatedNotifications({
          actorUserId: record.actorUserId,
          activeUserIds,
          createdSupportIds,
          requestedForUserId: ticket.requestedForUserId,
          ticketId: ticket.id,
          ticketNumber: ticketDisplayNumber,
        }),
      );

      return;
    }

    const recipientIds = resolveRecipientIds(
      record,
      requesterIds,
      assignedSupportIds,
      assignmentRecipientIds,
      createdSupportIds,
    );
    recipientIds.delete(record.actorUserId);

    const content = buildNotificationContent(record, ticketDisplayNumber);

    await this.notificationRepository.createMany(
      [...recipientIds].map((recipientUserId) => ({
        actorUserId: record.actorUserId,
        link: `/agent/tickets/${ticket.id}`,
        message: content.message,
        recipientUserId,
        ticketId: ticket.id,
        title: content.title,
        type: content.type,
      })),
    );
  }
}

function buildTicketCreatedNotifications({
  actorUserId,
  activeUserIds,
  createdSupportIds,
  requestedForUserId,
  ticketId,
  ticketNumber,
}: {
  actorUserId: string | null;
  activeUserIds: Set<string>;
  createdSupportIds: Set<string>;
  requestedForUserId: string | null;
  ticketId: string;
  ticketNumber: string;
}): CreateNotificationRecord[] {
  const requesterRecipientIds =
    requestedForUserId && activeUserIds.has(requestedForUserId)
      ? new Set([requestedForUserId])
      : new Set<string>();
  const supportRecipientIds = new Set(createdSupportIds);

  if (actorUserId) {
    requesterRecipientIds.delete(actorUserId);
    supportRecipientIds.delete(actorUserId);
  }

  for (const requesterRecipientId of requesterRecipientIds) {
    supportRecipientIds.delete(requesterRecipientId);
  }

  return [
    ...[...supportRecipientIds].map((recipientUserId) => ({
      actorUserId,
      link: `/agent/tickets/${ticketId}`,
      message: `Le ticket ${ticketNumber} vient d'être créé.`,
      recipientUserId,
      ticketId,
      title: 'Nouveau ticket',
      type: NotificationType.TICKET_CREATED,
    })),
    ...[...requesterRecipientIds].map((recipientUserId) => ({
      actorUserId,
      link: `/agent/tickets/${ticketId}`,
      message: `Le ticket ${ticketNumber} a été créé pour vous.`,
      recipientUserId,
      ticketId,
      title: 'Ticket créé pour vous',
      type: NotificationType.TICKET_CREATED,
    })),
  ];
}

function resolveSupportRecipientIds(
  assignedToUserId: string | null,
  activeUserIds: Set<string>,
  groupSupportIds: Set<string>,
  adminIds: Set<string>,
): Set<string> {
  if (assignedToUserId && activeUserIds.has(assignedToUserId)) {
    return new Set([assignedToUserId]);
  }

  if (groupSupportIds.size > 0) {
    return new Set(groupSupportIds);
  }

  return new Set(adminIds);
}

function isNotifiableEvent(eventType: TicketHistoryEventType): boolean {
  return (
    eventType === TicketHistoryEventType.CREATED ||
    eventType === TicketHistoryEventType.ASSIGNED ||
    eventType === TicketHistoryEventType.COMMENT_ADDED ||
    eventType === TicketHistoryEventType.STATUS_CHANGED
  );
}

function resolveRecipientIds(
  record: CreateTicketHistoryRecord,
  requesterIds: Set<string>,
  assignedSupportIds: Set<string>,
  assignmentRecipientIds: Set<string>,
  createdSupportIds: Set<string>,
): Set<string> {
  if (record.eventType === TicketHistoryEventType.CREATED) {
    return new Set(createdSupportIds);
  }

  if (record.eventType === TicketHistoryEventType.ASSIGNED) {
    return new Set(assignmentRecipientIds);
  }

  if (record.eventType === TicketHistoryEventType.COMMENT_ADDED) {
    return new Set([...requesterIds, ...assignedSupportIds]);
  }

  return new Set([...requesterIds, ...assignmentRecipientIds]);
}

function buildNotificationContent(
  record: CreateTicketHistoryRecord,
  ticketNumber: string,
): { message: string; title: string; type: NotificationType } {
  if (record.eventType === TicketHistoryEventType.CREATED) {
    return {
      message: `Le ticket ${ticketNumber} vient d'être créé.`,
      title: 'Nouveau ticket',
      type: NotificationType.TICKET_CREATED,
    };
  }

  if (record.eventType === TicketHistoryEventType.ASSIGNED) {
    return {
      message: `Le ticket ${ticketNumber} a été affecté à vous.`,
      title: 'Nouvelle affectation',
      type: NotificationType.TICKET_ASSIGNED,
    };
  }

  if (record.eventType === TicketHistoryEventType.COMMENT_ADDED) {
    return {
      message: `Un nouveau commentaire a été ajouté au ticket ${ticketNumber}.`,
      title: 'Nouveau commentaire',
      type: NotificationType.TICKET_COMMENTED,
    };
  }

  const toStatus = record.payload?.toStatus;
  const status = typeof toStatus === 'string' ? toStatus : '';

  return {
    message: `Le ticket ${ticketNumber} est maintenant ${formatStatus(status)}.`,
    title: 'Statut du ticket modifié',
    type: NotificationType.TICKET_STATUS_CHANGED,
  };
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    [TicketStatus.OPEN]: 'ouvert',
    [TicketStatus.IN_PROGRESS]: 'en cours',
    [TicketStatus.PENDING]: 'en attente',
    [TicketStatus.RESOLVED]: 'résolu',
    [TicketStatus.CLOSED]: 'clos',
  };

  return labels[status] ?? status.toLowerCase();
}

function formatTicketDisplayNumber(type: TicketType, number: string): string {
  const numberSuffix = number.split('-').at(-1) ?? number;

  if (type === TicketType.INCIDENT) {
    return `INC-${numberSuffix}`;
  }

  if (type === TicketType.REQUEST) {
    return `DEM-${numberSuffix}`;
  }

  return number;
}
