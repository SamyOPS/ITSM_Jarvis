import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AddTicketCommentUseCase } from '../../../application/ticketing/use-cases/add-ticket-comment.use-case';
import { AssignTicketUseCase } from '../../../application/ticketing/use-cases/assign-ticket.use-case';
import { ChangeTicketStatusUseCase } from '../../../application/ticketing/use-cases/change-ticket-status.use-case';
import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { GetTicketByIdUseCase } from '../../../application/ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketCommentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-comments.use-case';
import { SearchTicketsUseCase } from '../../../application/ticketing/use-cases/search-tickets.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { UserRole } from '../../../domain/auth/user-role';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AddTicketCommentDto } from './add-ticket-comment.dto';
import type { AssignTicketDto } from './assign-ticket.dto';
import type { ChangeTicketStatusDto } from './change-ticket-status.dto';
import type { CreateIncidentDto } from './create-incident.dto';
import type { CreateRequestDto } from './create-request.dto';

type SearchTicketsQueryDto = {
  assignedToUserId?: string;
  assignmentGroupId?: string;
  categoryId?: string;
  channelId?: string;
  createdByUserId?: string;
  priorityId?: string;
  q?: string;
  requestedForUserId?: string;
  serviceId?: string;
  status?: TicketStatus;
  type?: TicketType;
};

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly assignTicketUseCase: AssignTicketUseCase,
    private readonly changeTicketStatusUseCase: ChangeTicketStatusUseCase,
    private readonly createIncidentUseCase: CreateIncidentUseCase,
    private readonly createRequestUseCase: CreateRequestUseCase,
    private readonly searchTicketsUseCase: SearchTicketsUseCase,
    private readonly getTicketByIdUseCase: GetTicketByIdUseCase,
    private readonly listTicketCommentsUseCase: ListTicketCommentsUseCase,
    private readonly addTicketCommentUseCase: AddTicketCommentUseCase,
  ) {}

  @Get()
  @UseGuards(BearerAuthGuard)
  listTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchTicketsQueryDto,
  ): Promise<TicketSummary[]> {
    return this.searchTicketsUseCase.execute({
      ...query,
      requesterUserId: user.id,
      requesterUserRole: user.role,
    });
  }

  @Get(':id')
  @UseGuards(BearerAuthGuard)
  getTicketById(@Param('id') id: string): Promise<TicketDetail> {
    return this.getTicketByIdUseCase.execute(id);
  }

  @Get(':id/comments')
  @UseGuards(BearerAuthGuard)
  listComments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketComment[]> {
    return this.listTicketCommentsUseCase.execute(id, user.id, user.role);
  }

  @Patch(':id/assign')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  assignTicket(
    @Param('id') id: string,
    @Body() body: AssignTicketDto,
  ): Promise<TicketDetail> {
    return this.assignTicketUseCase.execute({
      assignedToUserId: body.assignedToUserId ?? null,
      assignmentGroupId: body.assignmentGroupId ?? null,
      ticketId: id,
    });
  }

  @Patch(':id/status')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeTicketStatusDto,
  ): Promise<TicketDetail> {
    return this.changeTicketStatusUseCase.execute({
      status: body.status,
      ticketId: id,
    });
  }

  @Post(':id/comments')
  @UseGuards(BearerAuthGuard)
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddTicketCommentDto,
  ): Promise<TicketComment> {
    return this.addTicketCommentUseCase.execute({
      authorRole: user.role,
      authorUserId: user.id,
      body: body.body,
      isInternal: body.isInternal,
      ticketId: id,
    });
  }

  @Post('incidents')
  @UseGuards(BearerAuthGuard)
  createIncident(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateIncidentDto,
  ): Promise<CreatedIncident> {
    return this.createIncidentUseCase.execute({
      ...body,
      createdByUserId: user.id,
    });
  }

  @Post('requests')
  @UseGuards(BearerAuthGuard)
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRequestDto,
  ): Promise<CreatedRequest> {
    return this.createRequestUseCase.execute({
      ...body,
      createdByUserId: user.id,
    });
  }
}
