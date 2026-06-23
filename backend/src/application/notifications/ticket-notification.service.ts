import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../domain/auth/user-role';
import { NotificationType } from '../../domain/notifications/notification-type';
import { TicketHistoryEventType } from '../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { TicketReadRepository } from '../ticketing/repositories/ticket-read.repository';
import { type CreateTicketHistoryRecord } from '../ticketing/repositories/ticket-history-write.repository';
import { NotificationRepository } from './repositories/notification.repository';

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
    const activeUserIds = new Set(users.map((user) => user.id));
    const requesterIds = new Set(
      [ticket.createdByUserId, ticket.requestedForUserId]
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => activeUserIds.has(userId)),
    );
    const adminIds = new Set(
      users
        .filter((user) => user.role === UserRole.ADMIN)
        .map((user) => user.id),
    );
    const groupSupportIds = new Set<string>();

    if (ticket.assignmentGroupId) {
      for (const user of users) {
        if (
          (user.role === UserRole.AGENT || user.role === UserRole.ADMIN) &&
          user.groupIds.includes(ticket.assignmentGroupId)
        ) {
          groupSupportIds.add(user.id);
        }
      }
    }

    const effectiveSupportIds = resolveSupportRecipientIds(
      ticket.assignedToUserId,
      activeUserIds,
      groupSupportIds,
      adminIds,
    );
    const recipientIds = resolveRecipientIds(
      record,
      requesterIds,
      effectiveSupportIds,
    );
    recipientIds.delete(record.actorUserId);

    const content = buildNotificationContent(record, ticket.number);

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
  supportIds: Set<string>,
): Set<string> {
  if (record.eventType === TicketHistoryEventType.CREATED) {
    return new Set(supportIds);
  }

  if (record.eventType === TicketHistoryEventType.ASSIGNED) {
    return new Set(supportIds);
  }

  if (
    record.eventType === TicketHistoryEventType.COMMENT_ADDED &&
    record.payload?.isInternal === true
  ) {
    return new Set(supportIds);
  }

  return new Set([...requesterIds, ...supportIds]);
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
      message: `Le ticket ${ticketNumber} a été affecté à vous ou à votre groupe.`,
      title: 'Nouvelle affectation',
      type: NotificationType.TICKET_ASSIGNED,
    };
  }

  if (record.eventType === TicketHistoryEventType.COMMENT_ADDED) {
    const isInternal = record.payload?.isInternal === true;

    return {
      message: isInternal
        ? `Une note interne a été ajoutée au ticket ${ticketNumber}.`
        : `Un nouveau commentaire a été ajouté au ticket ${ticketNumber}.`,
      title: isInternal ? 'Nouvelle note interne' : 'Nouveau commentaire',
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
