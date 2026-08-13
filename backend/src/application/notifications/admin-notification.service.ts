import { Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { isAdminRole } from '../../domain/auth/user-role';
import { NotificationPreferenceKey } from '../../domain/notifications/notification-preference';
import { NotificationType } from '../../domain/notifications/notification-type';
import {
  type CreateNotificationRecord,
  NotificationRepository,
} from './repositories/notification.repository';

@Injectable()
export class AdminNotificationService {
  constructor(
    @Inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async notifyUserCreated(
    actorUserId: string | null,
    user: AdminUserSummary,
  ): Promise<void> {
    await this.notifyAdmins({
      actorUserId,
      link: '/admin/users',
      message: `${formatUserName(user)} a ete cree ou inscrit.`,
      preferenceKey: NotificationPreferenceKey.ADMIN_USER_CREATED,
      title: 'Nouvel utilisateur',
      type: NotificationType.ADMIN_USER_CREATED,
    });
  }

  async notifyUserStatusChanged(
    actorUserId: string,
    user: AdminUserSummary,
  ): Promise<void> {
    await this.notifyAdmins({
      actorUserId,
      link: '/admin/users',
      message: `${formatUserName(user)} a ete ${
        user.isActive ? 'reactive' : 'desactive'
      }.`,
      preferenceKey: NotificationPreferenceKey.ADMIN_USER_STATUS_CHANGED,
      title: 'Statut utilisateur modifie',
      type: NotificationType.ADMIN_USER_STATUS_CHANGED,
    });
  }

  async notifyUserRoleChanged(
    actorUserId: string,
    user: AdminUserSummary,
  ): Promise<void> {
    await this.notifyAdmins({
      actorUserId,
      link: '/admin/users',
      message: `Le role de ${formatUserName(user)} est maintenant ${user.role}.`,
      preferenceKey: NotificationPreferenceKey.ADMIN_USER_ROLE_CHANGED,
      title: 'Role utilisateur modifie',
      type: NotificationType.ADMIN_USER_ROLE_CHANGED,
    });
  }

  async notifyUserCharacteristicsChanged(
    actorUserId: string,
    user: AdminUserSummary,
  ): Promise<void> {
    await this.notifyAdmins({
      actorUserId,
      link: '/admin/users',
      message: `Les caracteristiques de ${formatUserName(user)} ont ete modifiees.`,
      preferenceKey:
        NotificationPreferenceKey.ADMIN_USER_CHARACTERISTICS_CHANGED,
      title: 'Caracteristiques utilisateur modifiees',
      type: NotificationType.ADMIN_USER_CHARACTERISTICS_CHANGED,
    });
  }

  async notifyUserGroupsChanged(
    actorUserId: string,
    user: AdminUserSummary,
  ): Promise<void> {
    await this.notifyAdmins({
      actorUserId,
      link: '/admin/users',
      message: `Les groupes de ${formatUserName(user)} ont ete modifies.`,
      preferenceKey: NotificationPreferenceKey.ADMIN_USER_GROUP_CHANGED,
      title: 'Groupes utilisateur modifies',
      type: NotificationType.ADMIN_USER_GROUP_CHANGED,
    });
  }

  async notifyGroupChanged(
    actorUserId: string,
    action: 'cree' | 'modifie' | 'supprime',
    groupName: string,
  ): Promise<void> {
    await this.notifyAdmins({
      actorUserId,
      link: '/admin/groups',
      message: `Le groupe ${groupName} a ete ${action}.`,
      preferenceKey: NotificationPreferenceKey.ADMIN_GROUP_CHANGED,
      title: 'Groupe modifie',
      type: NotificationType.ADMIN_GROUP_CHANGED,
    });
  }

  private async notifyAdmins(event: {
    actorUserId: string | null;
    link: string;
    message: string;
    preferenceKey: NotificationPreferenceKey;
    title: string;
    type: NotificationType;
  }): Promise<void> {
    try {
      const recipients =
        await this.notificationRepository.listActiveRecipients();
      const adminIds = recipients
        .filter((recipient) => isAdminRole(recipient.role))
        .map((recipient) => recipient.id)
        .filter((recipientId) => recipientId !== event.actorUserId);
      const preferencesByUserId =
        await this.notificationRepository.listPreferencesForUsers(adminIds);

      const records: CreateNotificationRecord[] = adminIds
        .filter(
          (recipientUserId) =>
            preferencesByUserId.get(recipientUserId)?.[event.preferenceKey] ??
            false,
        )
        .map((recipientUserId) => ({
          actorUserId: event.actorUserId,
          link: event.link,
          message: event.message,
          recipientUserId,
          ticketId: null,
          title: event.title,
          type: event.type,
        }));

      await this.notificationRepository.createMany(records);
    } catch {
      return;
    }
  }
}

function formatUserName(user: AdminUserSummary): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);

  return ((user.displayName ?? parts.join(' ')) || user.email) ?? user.id;
}
