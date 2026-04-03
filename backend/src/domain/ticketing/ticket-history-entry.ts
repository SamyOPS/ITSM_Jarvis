import { TicketHistoryEventType } from './ticket-history-event-type';

export class TicketHistoryEntry {
  constructor(
    public readonly id: string,
    public readonly ticketId: string,
    public readonly actorUserId: string,
    public readonly eventType: TicketHistoryEventType,
    public readonly payload: Record<string, unknown> | null,
    public readonly createdAt: string,
  ) {}
}
