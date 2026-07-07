import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  GetAgentPerformanceReportUseCase,
  type AgentPerformanceReport,
} from '../../../application/reporting/use-cases/get-agent-performance-report.use-case';
import {
  GetTicketReportingBreakdownUseCase,
  type TicketReportingBreakdown,
} from '../../../application/reporting/use-cases/get-ticket-reporting-breakdown.use-case';
import {
  GetTicketReportingOverviewUseCase,
  type TicketReportingOverview,
} from '../../../application/reporting/use-cases/get-ticket-reporting-overview.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

type TicketReportingOverviewQueryDto = {
  assignedToUserId?: string;
  assignmentGroupId?: string;
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
    private readonly getAgentPerformanceReportUseCase: GetAgentPerformanceReportUseCase,
    private readonly getTicketReportingBreakdownUseCase: GetTicketReportingBreakdownUseCase,
    private readonly getTicketReportingOverviewUseCase: GetTicketReportingOverviewUseCase,
  ) {}

  @Get('agent-performance')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  getAgentPerformance(
    @Query() query: TicketReportingOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentPerformanceReport> {
    return this.getAgentPerformanceReportUseCase.execute(
      scopeReportingQuery(query, user),
    );
  }

  @Get('breakdown')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  getBreakdown(
    @Query() query: TicketReportingOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketReportingBreakdown> {
    return this.getTicketReportingBreakdownUseCase.execute(
      scopeReportingQuery(query, user),
    );
  }

  @Get('overview')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  getOverview(
    @Query() query: TicketReportingOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketReportingOverview> {
    return this.getTicketReportingOverviewUseCase.execute(
      scopeReportingQuery(query, user),
    );
  }
}

function scopeReportingQuery(
  query: TicketReportingOverviewQueryDto,
  user: AuthenticatedUser,
): TicketReportingOverviewQueryDto {
  if (isAdminRole(user.role)) {
    return query;
  }

  return {
    ...query,
    assignedToUserId: user.id,
  };
}
