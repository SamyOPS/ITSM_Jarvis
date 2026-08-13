import { getFrontendRuntimeConfig } from '../config/env';

export type NotificationSnapshot = {
  actorUserId: string | null;
  createdAt: string;
  id: string;
  link: string | null;
  message: string;
  readAt: string | null;
  recipientUserId: string;
  ticketId: string | null;
  title: string;
  type:
    | 'ADMIN_GROUP_CHANGED'
    | 'ADMIN_USER_CHARACTERISTICS_CHANGED'
    | 'ADMIN_USER_CREATED'
    | 'ADMIN_USER_GROUP_CHANGED'
    | 'ADMIN_USER_ROLE_CHANGED'
    | 'ADMIN_USER_STATUS_CHANGED'
    | 'TICKET_CREATED'
    | 'TICKET_ASSIGNED'
    | 'TICKET_COMMENTED'
    | 'TICKET_SLA'
    | 'TICKET_STATUS_CHANGED';
};

export type NotificationPreferenceKey =
  | 'ADMIN_GROUP_CHANGED'
  | 'ADMIN_USER_CHARACTERISTICS_CHANGED'
  | 'ADMIN_USER_CREATED'
  | 'ADMIN_USER_GROUP_CHANGED'
  | 'ADMIN_USER_ROLE_CHANGED'
  | 'ADMIN_USER_STATUS_CHANGED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_COMMENT_ADDED'
  | 'TICKET_CREATED'
  | 'TICKET_GROUP'
  | 'TICKET_SLA'
  | 'TICKET_STATUS_CHANGED';

export type NotificationPreferences = Record<
  NotificationPreferenceKey,
  boolean
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  ADMIN_GROUP_CHANGED: false,
  ADMIN_USER_CHARACTERISTICS_CHANGED: false,
  ADMIN_USER_CREATED: false,
  ADMIN_USER_GROUP_CHANGED: false,
  ADMIN_USER_ROLE_CHANGED: false,
  ADMIN_USER_STATUS_CHANGED: false,
  TICKET_ASSIGNED: true,
  TICKET_COMMENT_ADDED: true,
  TICKET_CREATED: true,
  TICKET_GROUP: true,
  TICKET_SLA: false,
  TICKET_STATUS_CHANGED: true,
};

export async function fetchNotifications(
  accessToken: string,
): Promise<NotificationSnapshot[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/notifications`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      (await response.text()) ||
        `Le chargement des notifications a échoué (${response.status}).`,
    );
  }

  return (await response.json()) as NotificationSnapshot[];
}

export async function fetchNotificationPreferences(
  accessToken: string,
): Promise<NotificationPreferences> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/notifications/preferences`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      (await response.text()) ||
        `Le chargement des preferences de notifications a echoue (${response.status}).`,
    );
  }

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...((await response.json()) as Partial<NotificationPreferences>),
  };
}

export async function updateNotificationPreference(
  accessToken: string,
  preferenceKey: NotificationPreferenceKey,
  enabled: boolean,
): Promise<NotificationPreferences> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(
    `${apiUrl}/notifications/preferences/${encodeURIComponent(preferenceKey)}`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    },
  );

  if (!response.ok) {
    throw new Error(
      (await response.text()) ||
        `La preference de notification n a pas pu etre mise a jour (${response.status}).`,
    );
  }

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...((await response.json()) as Partial<NotificationPreferences>),
  };
}

export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<void> {
  await patchNotification(
    accessToken,
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  );
}

export async function markAllNotificationsRead(
  accessToken: string,
): Promise<void> {
  await patchNotification(accessToken, '/notifications/read-all');
}

export async function deleteNotification(
  accessToken: string,
  notificationId: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(
    `${apiUrl}/notifications/${encodeURIComponent(notificationId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      (await response.text()) ||
        `La suppression de la notification a échoué (${response.status}).`,
    );
  }
}

export async function deleteAllNotifications(
  accessToken: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/notifications`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      (await response.text()) ||
        `La suppression des notifications a échoué (${response.status}).`,
    );
  }
}

async function patchNotification(
  accessToken: string,
  path: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      (await response.text()) ||
        `La mise à jour de la notification a échoué (${response.status}).`,
    );
  }
}
