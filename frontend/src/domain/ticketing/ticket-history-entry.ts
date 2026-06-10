export type TicketHistoryEventType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'CATEGORY_CHANGED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_DELETED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketHistoryEntrySnapshot = {
  actorUserId: string;
  createdAt: string;
  eventType: TicketHistoryEventType;
  id: string;
  payload: Record<string, unknown> | null;
  ticketId: string;
};
