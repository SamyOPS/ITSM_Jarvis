import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  GetTicketReportingBreakdownUseCase,
  type TicketReportingBreakdown,
} from '../../../application/reporting/use-cases/get-ticket-reporting-breakdown.use-case';
import {
  GetTicketReportingOverviewUseCase,
  type TicketReportingOverview,
} from '../../../application/reporting/use-cases/get-ticket-reporting-overview.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

type TicketReportingOverviewQueryDto = {
  assignedToUserId?: string;
  categoryId?: string;
  from?: string;
  priorityId?: string;
  status?: TicketStatus;
  to?: string;
  type?: TicketType;
};

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly getTicketReportingBreakdownUseCase: GetTicketReportingBreakdownUseCase,
    private readonly getTicketReportingOverviewUseCase: GetTicketReportingOverviewUseCase,
  ) {}

  @Get('breakdown')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  getBreakdown(
    @Query() query: TicketReportingOverviewQueryDto,
  ): Promise<TicketReportingBreakdown> {
    return this.getTicketReportingBreakdownUseCase.execute(query);
  }

  @Get('overview')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  getOverview(
    @Query() query: TicketReportingOverviewQueryDto,
  ): Promise<TicketReportingOverview> {
    return this.getTicketReportingOverviewUseCase.execute(query);
  }
}
