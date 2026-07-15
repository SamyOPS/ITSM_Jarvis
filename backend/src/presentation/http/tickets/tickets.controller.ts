import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AddTicketAttachmentUseCase } from '../../../application/ticketing/use-cases/add-ticket-attachment.use-case';
import { AddTicketCommentUseCase } from '../../../application/ticketing/use-cases/add-ticket-comment.use-case';
import {
  ArchiveExpiredTicketsUseCase,
  type ArchiveExpiredTicketsResult,
} from '../../../application/ticketing/use-cases/archive-expired-tickets.use-case';
import { AssignTicketUseCase } from '../../../application/ticketing/use-cases/assign-ticket.use-case';
import { ChangeTicketPriorityUseCase } from '../../../application/ticketing/use-cases/change-ticket-priority.use-case';
import { ChangeTicketStatusUseCase } from '../../../application/ticketing/use-cases/change-ticket-status.use-case';
import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { DeleteTicketAttachmentUseCase } from '../../../application/ticketing/use-cases/delete-ticket-attachment.use-case';
import { DeleteTicketCommentUseCase } from '../../../application/ticketing/use-cases/delete-ticket-comment.use-case';
import { DeleteTicketUseCase } from '../../../application/ticketing/use-cases/delete-ticket.use-case';
import { GetTicketByIdUseCase } from '../../../application/ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketAttachmentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-attachments.use-case';
import { ListTicketCommentsUseCase } from '../../../application/ticketing/use-cases/list-ticket-comments.use-case';
import { ListTicketHistoryUseCase } from '../../../application/ticketing/use-cases/list-ticket-history.use-case';
import { SearchTicketsUseCase } from '../../../application/ticketing/use-cases/search-tickets.use-case';
import {
  SuggestTicketDraftUseCase,
  type TicketDraftSuggestion,
} from '../../../application/ticketing/use-cases/suggest-ticket-draft.use-case';
import { UpdateTicketUseCase } from '../../../application/ticketing/use-cases/update-ticket.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AddTicketAttachmentDto } from './add-ticket-attachment.dto';
import { AddTicketCommentDto } from './add-ticket-comment.dto';
import { AssignTicketDto } from './assign-ticket.dto';
import { ChangeTicketPriorityDto } from './change-ticket-priority.dto';
import { ChangeTicketStatusDto } from './change-ticket-status.dto';
import { CreateIncidentDto } from './create-incident.dto';
import { CreateRequestDto } from './create-request.dto';
import { SuggestTicketDraftDto } from './suggest-ticket-draft.dto';
import { UpdateTicketDto } from './update-ticket.dto';

type SearchTicketsQueryDto = {
  assignedToUserId?: string;
  assignmentGroupId?: string;
  categoryId?: string;
  channelId?: string;
  createdByUserId?: string;
  includeArchived?: string;
  priorityId?: string;
  q?: string;
  requestedForUserId?: string;
  status?: TicketStatus;
  type?: TicketType;
};

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly assignTicketUseCase: AssignTicketUseCase,
    private readonly archiveExpiredTicketsUseCase: ArchiveExpiredTicketsUseCase,
    private readonly changeTicketPriorityUseCase: ChangeTicketPriorityUseCase,
    private readonly changeTicketStatusUseCase: ChangeTicketStatusUseCase,
    private readonly createIncidentUseCase: CreateIncidentUseCase,
    private readonly createRequestUseCase: CreateRequestUseCase,
    private readonly searchTicketsUseCase: SearchTicketsUseCase,
    private readonly suggestTicketDraftUseCase: SuggestTicketDraftUseCase,
    private readonly getTicketByIdUseCase: GetTicketByIdUseCase,
    private readonly listTicketCommentsUseCase: ListTicketCommentsUseCase,
    private readonly listTicketHistoryUseCase: ListTicketHistoryUseCase,
    private readonly addTicketCommentUseCase: AddTicketCommentUseCase,
    private readonly deleteTicketCommentUseCase: DeleteTicketCommentUseCase,
    private readonly listTicketAttachmentsUseCase: ListTicketAttachmentsUseCase,
    private readonly addTicketAttachmentUseCase: AddTicketAttachmentUseCase,
    private readonly deleteTicketAttachmentUseCase: DeleteTicketAttachmentUseCase,
    private readonly deleteTicketUseCase: DeleteTicketUseCase,
    private readonly updateTicketUseCase: UpdateTicketUseCase,
  ) {}

  @Get()
  @UseGuards(BearerAuthGuard)
  listTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchTicketsQueryDto,
  ): Promise<TicketSummary[]> {
    return this.searchTicketsUseCase.execute({
      ...query,
      includeArchived:
        isAdminRole(user.role) && query.includeArchived === 'true',
      requesterUserId: user.id,
      requesterUserRole: user.role,
    });
  }

  @Get(':id')
  @UseGuards(BearerAuthGuard)
  getTicketById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketDetail> {
    return this.getTicketByIdUseCase.execute({
      requesterUserId: user.id,
      requesterUserRole: user.role,
      ticketId: id,
    });
  }

  @Post('archive-expired')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  archiveExpiredTickets(): Promise<ArchiveExpiredTicketsResult> {
    return this.archiveExpiredTicketsUseCase.execute();
  }

  @Post('assist-draft')
  @UseGuards(BearerAuthGuard)
  suggestTicketDraft(
    @Body() body: SuggestTicketDraftDto,
  ): Promise<TicketDraftSuggestion> {
    return this.suggestTicketDraftUseCase.execute({
      categories: body.categories,
      currentMode: body.currentMode ?? null,
      priorities: body.priorities,
      userInput: body.userInput,
    });
  }

  @Delete(':id')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteTicketUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      ticketId: id,
    });
  }

  @Patch(':id')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateTicketDto,
  ): Promise<TicketDetail> {
    return this.updateTicketUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      categoryId: body.categoryId,
      channelId: body.channelId ?? null,
      ciId: body.ciId ?? null,
      description: body.description,
      impact: body.impact ?? null,
      requestedForUserId: body.requestedForUserId ?? null,
      rootCause: body.rootCause ?? null,
      ticketId: id,
      title: body.title,
      urgency: body.urgency ?? null,
      workaround: body.workaround ?? null,
    });
  }

  @Get(':id/comments')
  @UseGuards(BearerAuthGuard)
  listComments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketComment[]> {
    return this.listTicketCommentsUseCase.execute(id, user.id, user.role);
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

  @Get(':id/history')
  @UseGuards(BearerAuthGuard)
  listHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketHistoryEntry[]> {
    return this.listTicketHistoryUseCase.execute(id, user.id, user.role);
  }

  @Delete(':ticketId/comments/:commentId')
  @UseGuards(BearerAuthGuard)
  async deleteComment(
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteTicketCommentUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      commentId,
      ticketId,
    });
  }

  @Get(':id/attachments')
  @UseGuards(BearerAuthGuard)
  listAttachments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketAttachment[]> {
    return this.listTicketAttachmentsUseCase.execute(id, user.id, user.role);
  }

  @Post(':id/attachments')
  @UseGuards(BearerAuthGuard)
  addAttachment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddTicketAttachmentDto,
  ): Promise<TicketAttachment> {
    return this.addTicketAttachmentUseCase.execute({
      bucketId: body.bucketId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storagePath: body.storagePath,
      ticketId: id,
      uploaderRole: user.role,
      uploaderUserId: user.id,
    });
  }

  @Delete(':ticketId/attachments/:attachmentId')
  @UseGuards(BearerAuthGuard)
  async deleteAttachment(
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteTicketAttachmentUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      attachmentId,
      ticketId,
    });
  }

  @Patch(':id/assign')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  assignTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AssignTicketDto,
  ): Promise<TicketDetail> {
    return this.assignTicketUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      assignedToUserId: body.assignedToUserId ?? null,
      assignmentGroupId: body.assignmentGroupId ?? null,
      ticketId: id,
    });
  }

  @Patch(':id/status')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.DEMANDEUR)
  changeStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangeTicketStatusDto,
  ): Promise<TicketDetail> {
    return this.changeTicketStatusUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      status: body.status,
      ticketId: id,
    });
  }

  @Patch(':id/priority')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  changePriority(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangeTicketPriorityDto,
  ): Promise<TicketDetail> {
    return this.changeTicketPriorityUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      priorityId: body.priorityId,
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
