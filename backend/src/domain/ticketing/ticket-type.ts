export enum TicketType {
  INCIDENT = 'INCIDENT',
  REQUEST = 'REQUEST',
}

export const DEFAULT_TICKET_TYPES = [
  TicketType.INCIDENT,
  TicketType.REQUEST,
] as const;
