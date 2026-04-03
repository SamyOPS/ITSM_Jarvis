import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
    const actorUserId = input.actorUserId.trim();
    const ticketId = input.ticketId.trim();

    if (!actorUserId) {
      throw new BadRequestException(
        'actorUserId is required for ticket audit.',
      );
    }

    if (!ticketId) {
      throw new BadRequestException('ticketId is required for ticket audit.');
    }

    const record: CreateTicketHistoryRecord = {
      actorUserId,
      eventType: input.eventType,
      payload: input.payload ?? null,
      ticketId,
    };

    await this.ticketHistoryWriteRepository.addTicketHistoryEntry(record);
  }
}
