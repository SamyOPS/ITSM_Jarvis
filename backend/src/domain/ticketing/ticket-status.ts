export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export const DEFAULT_TICKET_STATUSES = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
] as const;
