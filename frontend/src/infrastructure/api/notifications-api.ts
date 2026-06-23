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
    | 'TICKET_CREATED'
    | 'TICKET_ASSIGNED'
    | 'TICKET_COMMENTED'
    | 'TICKET_STATUS_CHANGED';
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
