import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';

export type CreateTicketHistoryRecord = {
  actorUserId: string;
  eventType: TicketHistoryEventType;
  payload?: Record<string, unknown> | null;
  ticketId: string;
};

export abstract class TicketHistoryWriteRepository {
  abstract addTicketHistoryEntry(
    record: CreateTicketHistoryRecord,
  ): Promise<void>;
}
