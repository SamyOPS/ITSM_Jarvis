export enum NotificationPreferenceKey {
  ADMIN_GROUP_CHANGED = 'ADMIN_GROUP_CHANGED',
  ADMIN_USER_CHARACTERISTICS_CHANGED = 'ADMIN_USER_CHARACTERISTICS_CHANGED',
  ADMIN_USER_CREATED = 'ADMIN_USER_CREATED',
  ADMIN_USER_GROUP_CHANGED = 'ADMIN_USER_GROUP_CHANGED',
  ADMIN_USER_ROLE_CHANGED = 'ADMIN_USER_ROLE_CHANGED',
  ADMIN_USER_STATUS_CHANGED = 'ADMIN_USER_STATUS_CHANGED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_COMMENT_ADDED = 'TICKET_COMMENT_ADDED',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_GROUP = 'TICKET_GROUP',
  TICKET_SLA = 'TICKET_SLA',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
}

export type NotificationPreferenceSnapshot = Record<
  NotificationPreferenceKey,
  boolean
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceSnapshot =
  {
    [NotificationPreferenceKey.ADMIN_GROUP_CHANGED]: false,
    [NotificationPreferenceKey.ADMIN_USER_CHARACTERISTICS_CHANGED]: false,
    [NotificationPreferenceKey.ADMIN_USER_CREATED]: false,
    [NotificationPreferenceKey.ADMIN_USER_GROUP_CHANGED]: false,
    [NotificationPreferenceKey.ADMIN_USER_ROLE_CHANGED]: false,
    [NotificationPreferenceKey.ADMIN_USER_STATUS_CHANGED]: false,
    [NotificationPreferenceKey.TICKET_ASSIGNED]: true,
    [NotificationPreferenceKey.TICKET_COMMENT_ADDED]: true,
    [NotificationPreferenceKey.TICKET_CREATED]: true,
    [NotificationPreferenceKey.TICKET_GROUP]: true,
    [NotificationPreferenceKey.TICKET_SLA]: false,
    [NotificationPreferenceKey.TICKET_STATUS_CHANGED]: true,
  };

export function buildDefaultNotificationPreferences(): NotificationPreferenceSnapshot {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function isNotificationPreferenceKey(
  value: string,
): value is NotificationPreferenceKey {
  return Object.values(NotificationPreferenceKey).includes(
    value as NotificationPreferenceKey,
  );
}
