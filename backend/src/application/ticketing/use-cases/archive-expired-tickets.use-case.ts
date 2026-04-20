import { Inject, Injectable } from '@nestjs/common';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';

export type ArchiveExpiredTicketsResult = {
  archivedCount: number;
  cutoff: string;
};

const CLOSED_TICKET_RETENTION_DAYS = 60;

@Injectable()
export class ArchiveExpiredTicketsUseCase {
  constructor(
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
  ) {}

  async execute(now = new Date()): Promise<ArchiveExpiredTicketsResult> {
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - CLOSED_TICKET_RETENTION_DAYS);
    const cutoffIso = cutoff.toISOString();
    const archivedCount =
      await this.ticketWriteRepository.archiveClosedTicketsBefore(cutoffIso);

    return {
      archivedCount,
      cutoff: cutoffIso,
    };
  }
}
