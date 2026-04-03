import { Inject, Injectable } from '@nestjs/common';
import { TicketHistoryEventType } from '../../domain/ticketing/ticket-history-event-type';
import {
  CreateTicketHistoryRecord,
  TicketHistoryWriteRepository,
} from './repositories/ticket-history-write.repository';

type WriteTicketAuditInput = {
  actorUserId: string;
  eventType: TicketHistoryEventType;
  payload?: Record<string, unknown> | null;
  ticketId: string;
};

@Injectable()
export class TicketAuditService {
  constructor(
    @Inject(TicketHistoryWriteRepository)
    private readonly ticketHistoryWriteRepository: TicketHistoryWriteRepository,
  ) {}

  async write(input: WriteTicketAuditInput): Promise<void> {
    const record: CreateTicketHistoryRecord = {
      actorUserId: input.actorUserId.trim(),
      eventType: input.eventType,
      payload: input.payload ?? null,
      ticketId: input.ticketId.trim(),
    };

    await this.ticketHistoryWriteRepository.addTicketHistoryEntry(record);
  }
}
