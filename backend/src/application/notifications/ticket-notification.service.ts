import { Inject, Injectable } from '@nestjs/common';
import { isAdminRole, isSupportRole } from '../../domain/auth/user-role';
import {
  type NotificationPreferenceKey,
  type NotificationPreferenceSnapshot,
  NotificationPreferenceKey as PreferenceKey,
} from '../../domain/notifications/notification-preference';
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

type PendingNotificationRecord = CreateNotificationRecord & {
  preferenceKey: NotificationPreferenceKey;
};

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
    const beneficiaryIds = new Set(
      [ticket.requestedForUserId ?? ticket.createdByUserId]
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
      assignedSupportIds.size > 0
        ? assignedSupportIds
        : resolveGroupRecipientIds(groupSupportIds, groupAdminIds, adminIds);
    const commentSupportIds =
      assignedSupportIds.size > 0 ? assignedSupportIds : createdSupportIds;

    if (record.eventType === TicketHistoryEventType.CREATED) {
      await this.createFilteredNotifications(
        buildTicketCreatedNotifications({
          activeUserIds,
          actorUserId: record.actorUserId,
          assignedSupportIds,
          beneficiaryIds,
          createdSupportIds,
          hasAssignedAgent: Boolean(ticket.assignedToUserId),
          ticketId: ticket.id,
          ticketNumber: ticketDisplayNumber,
        }),
        activeUserIds,
      );

      return;
    }

    const recipientIds = resolveRecipientIds(
      record,
      beneficiaryIds,
      commentSupportIds,
      assignmentRecipientIds,
      createdSupportIds,
    );
    recipientIds.delete(record.actorUserId);

    const content = buildNotificationContent(record, ticketDisplayNumber);
    const assignmentToGroupOnly =
      record.eventType === TicketHistoryEventType.ASSIGNED &&
      assignedSupportIds.size === 0;

    await this.createFilteredNotifications(
      [...recipientIds].map((recipientUserId) => ({
        actorUserId: record.actorUserId,
        link: `/agent/tickets/${ticket.id}`,
        message: assignmentToGroupOnly
          ? `Le ticket ${ticketDisplayNumber} est arrive dans votre groupe.`
          : content.message,
        preferenceKey: assignmentToGroupOnly
          ? PreferenceKey.TICKET_GROUP
          : content.preferenceKey,
        recipientUserId,
        ticketId: ticket.id,
        title: assignmentToGroupOnly ? 'Ticket de groupe' : content.title,
        type: assignmentToGroupOnly
          ? NotificationType.TICKET_CREATED
          : content.type,
      })),
      activeUserIds,
    );
  }

  private async createFilteredNotifications(
    records: PendingNotificationRecord[],
    activeUserIds: Set<string>,
  ): Promise<void> {
    const recipientUserIds = [
      ...new Set(
        records
          .map((record) => record.recipientUserId)
          .filter((recipientUserId) => activeUserIds.has(recipientUserId)),
      ),
    ];
    const preferencesByUserId =
      await this.notificationRepository.listPreferencesForUsers(
        recipientUserIds,
      );

    await this.notificationRepository.createMany(
      records
        .filter((record) => isPreferenceEnabled(record, preferencesByUserId))
        .map(({ preferenceKey: _preferenceKey, ...record }) => record),
    );
  }
}

function buildTicketCreatedNotifications({
  activeUserIds,
  actorUserId,
  assignedSupportIds,
  beneficiaryIds,
  createdSupportIds,
  hasAssignedAgent,
  ticketId,
  ticketNumber,
}: {
  activeUserIds: Set<string>;
  actorUserId: string | null;
  assignedSupportIds: Set<string>;
  beneficiaryIds: Set<string>;
  createdSupportIds: Set<string>;
  hasAssignedAgent: boolean;
  ticketId: string;
  ticketNumber: string;
}): PendingNotificationRecord[] {
  const requesterRecipientIds = new Set(beneficiaryIds);
  const supportRecipientIds = new Set(createdSupportIds);

  if (actorUserId) {
    requesterRecipientIds.delete(actorUserId);
    supportRecipientIds.delete(actorUserId);
  }

  for (const requesterRecipientId of requesterRecipientIds) {
    supportRecipientIds.delete(requesterRecipientId);
  }

  return [
    ...[...supportRecipientIds]
      .filter((recipientUserId) => activeUserIds.has(recipientUserId))
      .map((recipientUserId) => ({
        actorUserId,
        link: `/agent/tickets/${ticketId}`,
        message: hasAssignedAgent
          ? `Le ticket ${ticketNumber} vous a ete assigne.`
          : `Le ticket ${ticketNumber} est arrive dans votre groupe.`,
        preferenceKey:
          hasAssignedAgent && assignedSupportIds.has(recipientUserId)
            ? PreferenceKey.TICKET_ASSIGNED
            : PreferenceKey.TICKET_GROUP,
        recipientUserId,
        ticketId,
        title: hasAssignedAgent ? 'Nouvelle affectation' : 'Ticket de groupe',
        type: hasAssignedAgent
          ? NotificationType.TICKET_ASSIGNED
          : NotificationType.TICKET_CREATED,
      })),
    ...[...requesterRecipientIds].map((recipientUserId) => ({
      actorUserId,
      link: `/agent/tickets/${ticketId}`,
      message: `Le ticket ${ticketNumber} a ete cree pour vous.`,
      preferenceKey: PreferenceKey.TICKET_CREATED,
      recipientUserId,
      ticketId,
      title: 'Ticket cree pour vous',
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

function resolveGroupRecipientIds(
  groupSupportIds: Set<string>,
  groupAdminIds: Set<string>,
  adminIds: Set<string>,
): Set<string> {
  if (groupSupportIds.size > 0) {
    return new Set(groupSupportIds);
  }

  if (groupAdminIds.size > 0) {
    return new Set(groupAdminIds);
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
  beneficiaryIds: Set<string>,
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
    return new Set([...beneficiaryIds, ...assignedSupportIds]);
  }

  return new Set([...beneficiaryIds, ...assignmentRecipientIds]);
}

function buildNotificationContent(
  record: CreateTicketHistoryRecord,
  ticketNumber: string,
): {
  message: string;
  preferenceKey: NotificationPreferenceKey;
  title: string;
  type: NotificationType;
} {
  if (record.eventType === TicketHistoryEventType.CREATED) {
    return {
      message: `Le ticket ${ticketNumber} vient d'etre cree.`,
      preferenceKey: PreferenceKey.TICKET_CREATED,
      title: 'Nouveau ticket',
      type: NotificationType.TICKET_CREATED,
    };
  }

  if (record.eventType === TicketHistoryEventType.ASSIGNED) {
    return {
      message: `Le ticket ${ticketNumber} a ete affecte a vous.`,
      preferenceKey: PreferenceKey.TICKET_ASSIGNED,
      title: 'Nouvelle affectation',
      type: NotificationType.TICKET_ASSIGNED,
    };
  }

  if (record.eventType === TicketHistoryEventType.COMMENT_ADDED) {
    return {
      message: `Un nouveau commentaire a ete ajoute au ticket ${ticketNumber}.`,
      preferenceKey: PreferenceKey.TICKET_COMMENT_ADDED,
      title: 'Nouveau commentaire',
      type: NotificationType.TICKET_COMMENTED,
    };
  }

  const toStatus = record.payload?.toStatus;
  const status = typeof toStatus === 'string' ? toStatus : '';

  return {
    message: `Le ticket ${ticketNumber} est maintenant ${formatStatus(status)}.`,
    preferenceKey: PreferenceKey.TICKET_STATUS_CHANGED,
    title: 'Statut du ticket modifie',
    type: NotificationType.TICKET_STATUS_CHANGED,
  };
}

function isPreferenceEnabled(
  record: PendingNotificationRecord,
  preferencesByUserId: Map<string, NotificationPreferenceSnapshot>,
): boolean {
  return (
    preferencesByUserId.get(record.recipientUserId)?.[record.preferenceKey] ??
    true
  );
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    [TicketStatus.OPEN]: 'ouvert',
    [TicketStatus.IN_PROGRESS]: 'en cours',
    [TicketStatus.PENDING]: 'en attente',
    [TicketStatus.RESOLVED]: 'resolu',
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
