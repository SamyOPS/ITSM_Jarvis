import { Notification } from '../../../domain/notifications/notification';
import {
  type NotificationPreferenceKey,
  type NotificationPreferenceSnapshot,
} from '../../../domain/notifications/notification-preference';
import { NotificationType } from '../../../domain/notifications/notification-type';
import { UserRole } from '../../../domain/auth/user-role';

export type CreateNotificationRecord = {
  actorUserId: string | null;
  link: string | null;
  message: string;
  recipientUserId: string;
  ticketId: string | null;
  title: string;
  type: NotificationType;
};

export type NotificationRecipientProfile = {
  groupIds: string[];
  id: string;
  role: UserRole;
};

export abstract class NotificationRepository {
  abstract createMany(records: CreateNotificationRecord[]): Promise<void>;
  abstract delete(notificationId: string, userId: string): Promise<void>;
  abstract deleteAll(userId: string): Promise<void>;
  abstract getPreferences(
    userId: string,
  ): Promise<NotificationPreferenceSnapshot>;
  abstract listActiveRecipients(): Promise<NotificationRecipientProfile[]>;
  abstract listPreferencesForUsers(
    userIds: string[],
  ): Promise<Map<string, NotificationPreferenceSnapshot>>;
  abstract listForUser(userId: string, limit: number): Promise<Notification[]>;
  abstract markAllRead(userId: string): Promise<void>;
  abstract markRead(notificationId: string, userId: string): Promise<void>;
  abstract updatePreference(
    userId: string,
    preferenceKey: NotificationPreferenceKey,
    enabled: boolean,
  ): Promise<NotificationPreferenceSnapshot>;
}
