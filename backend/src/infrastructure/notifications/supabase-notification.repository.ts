import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  type CreateNotificationRecord,
  type NotificationRecipientProfile,
  NotificationRepository,
} from '../../application/notifications/repositories/notification.repository';
import { UserRole } from '../../domain/auth/user-role';
import { Notification } from '../../domain/notifications/notification';
import { NotificationType } from '../../domain/notifications/notification-type';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseNotificationRow = {
  actor_user_id: string | null;
  created_at: string;
  id: string;
  link: string | null;
  message: string;
  read_at: string | null;
  recipient_user_id: string;
  ticket_id: string | null;
  title: string;
  type: NotificationType;
};

type SupabaseNotificationRecipientRow = {
  group_id: string | null;
  id: string;
  role: string;
  user_groups: Array<{ group_id: string }> | null;
};

const NOTIFICATION_SELECT =
  'id,recipient_user_id,actor_user_id,ticket_id,type,title,message,link,read_at,created_at';

@Injectable()
export class SupabaseNotificationRepository implements NotificationRepository {
  async createMany(records: CreateNotificationRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const response = await this.send(this.buildUrl('notifications'), {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(
        records.map((record) => ({
          actor_user_id: record.actorUserId,
          link: record.link,
          message: record.message,
          recipient_user_id: record.recipientUserId,
          ticket_id: record.ticketId,
          title: record.title,
          type: record.type,
        })),
      ),
    });

    await this.assertOk(response, 'creation');
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    const url = this.buildUrl('notifications');
    url.searchParams.set('id', `eq.${notificationId}`);
    url.searchParams.set('recipient_user_id', `eq.${userId}`);

    const response = await this.send(url, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });

    await this.assertOk(response, 'deletion');
  }

  async deleteAll(userId: string): Promise<void> {
    const url = this.buildUrl('notifications');
    url.searchParams.set('recipient_user_id', `eq.${userId}`);

    const response = await this.send(url, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });

    await this.assertOk(response, 'bulk deletion');
  }

  async listForUser(userId: string, limit: number): Promise<Notification[]> {
    const url = this.buildUrl('notifications');
    url.searchParams.set('select', NOTIFICATION_SELECT);
    url.searchParams.set('recipient_user_id', `eq.${userId}`);
    url.searchParams.set('order', 'created_at.desc');
    url.searchParams.set('limit', String(limit));

    const response = await this.send(url);
    await this.assertOk(response, 'lookup');
    const rows = (await response.json()) as SupabaseNotificationRow[];

    return rows.map(mapNotificationRow);
  }

  async listActiveRecipients(): Promise<NotificationRecipientProfile[]> {
    const url = this.buildUrl('users');
    url.searchParams.set('select', 'id,role,group_id,user_groups(group_id)');
    url.searchParams.set('is_active', 'eq.true');

    const response = await this.send(url);
    await this.assertOk(response, 'recipient lookup');
    const rows = (await response.json()) as SupabaseNotificationRecipientRow[];

    return rows.map((row) => ({
      groupIds: [
        ...new Set([
          ...(row.user_groups ?? []).map((group) => group.group_id),
          ...(row.group_id ? [row.group_id] : []),
        ]),
      ],
      id: row.id,
      role: resolveUserRole(row.role),
    }));
  }

  async markAllRead(userId: string): Promise<void> {
    const url = this.buildUrl('notifications');
    url.searchParams.set('recipient_user_id', `eq.${userId}`);
    url.searchParams.set('read_at', 'is.null');

    const response = await this.send(url, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });

    await this.assertOk(response, 'mark-all-read');
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const url = this.buildUrl('notifications');
    url.searchParams.set('id', `eq.${notificationId}`);
    url.searchParams.set('recipient_user_id', `eq.${userId}`);
    url.searchParams.set('read_at', 'is.null');

    const response = await this.send(url, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });

    await this.assertOk(response, 'mark-read');
  }

  private buildUrl(table: string): URL {
    const { supabaseUrl } = getBackendRuntimeConfig();

    if (!supabaseUrl) {
      throw new ServiceUnavailableException(
        'Supabase notification configuration is incomplete.',
      );
    }

    return new URL(`${supabaseUrl}/rest/v1/${table}`);
  }

  private async send(url: URL, init: RequestInit = {}): Promise<Response> {
    const { supabaseServiceRoleKey } = getBackendRuntimeConfig();

    if (!supabaseServiceRoleKey) {
      throw new ServiceUnavailableException(
        'Supabase notification configuration is incomplete.',
      );
    }

    try {
      return await fetch(url, {
        ...init,
        headers: {
          apikey: supabaseServiceRoleKey,
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Supabase notifications are unreachable from the backend.',
      );
    }
  }

  private async assertOk(response: Response, operation: string): Promise<void> {
    if (response.ok) {
      return;
    }

    const message = await response.text();

    throw new ServiceUnavailableException(
      message ||
        `Supabase notification ${operation} returned status ${response.status}.`,
    );
  }
}

function mapNotificationRow(row: SupabaseNotificationRow): Notification {
  return new Notification(
    row.id,
    row.recipient_user_id,
    row.actor_user_id,
    row.ticket_id,
    row.type,
    row.title,
    row.message,
    row.link,
    row.read_at,
    row.created_at,
  );
}

function resolveUserRole(role: string): UserRole {
  if (role === 'ADMIN') {
    return UserRole.ADMIN;
  }

  if (role === 'AGENT') {
    return UserRole.AGENT;
  }

  return UserRole.DEMANDEUR;
}
