import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArchiveExpiredTicketsUseCase } from './use-cases/archive-expired-tickets.use-case';

@Injectable()
export class TicketArchiveSchedulerService {
  private readonly logger = new Logger(TicketArchiveSchedulerService.name);

  constructor(
    private readonly archiveExpiredTicketsUseCase: ArchiveExpiredTicketsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveExpiredTickets(): Promise<void> {
    const result = await this.archiveExpiredTicketsUseCase.execute();

    if (result.archivedCount > 0) {
      this.logger.log(
        `Archived ${result.archivedCount} tickets closed before ${result.cutoff}.`,
      );
    }
  }
}
