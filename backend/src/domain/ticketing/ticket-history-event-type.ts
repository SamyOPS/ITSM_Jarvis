export enum TicketHistoryEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  CATEGORY_CHANGED = 'CATEGORY_CHANGED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export const DEFAULT_TICKET_HISTORY_EVENT_TYPES = [
  TicketHistoryEventType.CREATED,
  TicketHistoryEventType.STATUS_CHANGED,
  TicketHistoryEventType.PRIORITY_CHANGED,
  TicketHistoryEventType.CATEGORY_CHANGED,
  TicketHistoryEventType.ASSIGNED,
  TicketHistoryEventType.UNASSIGNED,
  TicketHistoryEventType.COMMENT_ADDED,
  TicketHistoryEventType.ATTACHMENT_ADDED,
  TicketHistoryEventType.ESCALATED,
  TicketHistoryEventType.RESOLVED,
  TicketHistoryEventType.CLOSED,
] as const;
