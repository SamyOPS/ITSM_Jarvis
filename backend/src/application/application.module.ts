import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GetAuthSetupUseCase } from './auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from './auth/use-cases/get-authenticated-user.use-case';
import { GetUserLicenseUseCase } from './auth/use-cases/get-user-license.use-case';
import { CreateAdminUserUseCase } from './auth/use-cases/create-admin-user.use-case';
import { DeleteAdminUserUseCase } from './auth/use-cases/delete-admin-user.use-case';
import { GetHealthUseCase } from './health/use-cases/get-health.use-case';
import { ListAdminUsersUseCase } from './auth/use-cases/list-admin-users.use-case';
import { RegisterRequesterUseCase } from './auth/use-cases/register-requester.use-case';
import { UpdateAdminUserUseCase } from './auth/use-cases/update-admin-user.use-case';
import { UpdateAdminUserGroupsUseCase } from './auth/use-cases/update-admin-user-groups.use-case';
import { UpdateAdminUserStatusUseCase } from './auth/use-cases/update-admin-user-status.use-case';
import { UpdateUserLicenseUseCase } from './auth/use-cases/update-user-license.use-case';
import { TicketNotificationService } from './notifications/ticket-notification.service';
import { DeleteNotificationUseCase } from './notifications/use-cases/delete-notification.use-case';
import { DeleteAllNotificationsUseCase } from './notifications/use-cases/delete-all-notifications.use-case';
import { ListNotificationsUseCase } from './notifications/use-cases/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from './notifications/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from './notifications/use-cases/mark-notification-read.use-case';
import { CreateGroupChatMessageUseCase } from './group-chat/use-cases/create-group-chat-message.use-case';
import { ListGroupChatMessagesUseCase } from './group-chat/use-cases/list-group-chat-messages.use-case';
import { GetReferentialCatalogUseCase } from './referentials/use-cases/get-referential-catalog.use-case';
import { ListCategoriesUseCase } from './referentials/use-cases/list-categories.use-case';
import { ListChannelsUseCase } from './referentials/use-cases/list-channels.use-case';
import { ListCisUseCase } from './referentials/use-cases/list-cis.use-case';
import { ListCiTypesUseCase } from './referentials/use-cases/list-ci-types.use-case';
import { ListGroupsUseCase } from './referentials/use-cases/list-groups.use-case';
import { ListPrioritiesUseCase } from './referentials/use-cases/list-priorities.use-case';
import { ManageCategoriesUseCase } from './referentials/use-cases/manage-categories.use-case';
import { ManageChannelsUseCase } from './referentials/use-cases/manage-channels.use-case';
import { ManageCisUseCase } from './referentials/use-cases/manage-cis.use-case';
import { ManageCiTypesUseCase } from './referentials/use-cases/manage-ci-types.use-case';
import { ManageGroupsUseCase } from './referentials/use-cases/manage-groups.use-case';
import { ManagePrioritiesUseCase } from './referentials/use-cases/manage-priorities.use-case';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { CreateKnowledgeArticleUseCase } from './knowledge/use-cases/create-knowledge-article.use-case';
import { AddKnowledgeArticleAttachmentUseCase } from './knowledge/use-cases/add-knowledge-article-attachment.use-case';
import { DeleteKnowledgeArticleUseCase } from './knowledge/use-cases/delete-knowledge-article.use-case';
import { DeleteKnowledgeArticleAttachmentUseCase } from './knowledge/use-cases/delete-knowledge-article-attachment.use-case';
import { GetKnowledgeArticleUseCase } from './knowledge/use-cases/get-knowledge-article.use-case';
import { ListKnowledgeArticlesUseCase } from './knowledge/use-cases/list-knowledge-articles.use-case';
import { ListKnowledgeArticleAttachmentsUseCase } from './knowledge/use-cases/list-knowledge-article-attachments.use-case';
import { ToggleKnowledgeArticleLikeUseCase } from './knowledge/use-cases/toggle-knowledge-article-like.use-case';
import { UpdateKnowledgeArticleUseCase } from './knowledge/use-cases/update-knowledge-article.use-case';
import { CreatePlanningTaskUseCase } from './planning/use-cases/create-planning-task.use-case';
import { DeletePlanningTaskUseCase } from './planning/use-cases/delete-planning-task.use-case';
import { ListPlanningTasksUseCase } from './planning/use-cases/list-planning-tasks.use-case';
import { UpdatePlanningTaskUseCase } from './planning/use-cases/update-planning-task.use-case';
import { GetAgentPerformanceReportUseCase } from './reporting/use-cases/get-agent-performance-report.use-case';
import { GetTicketReportingBreakdownUseCase } from './reporting/use-cases/get-ticket-reporting-breakdown.use-case';
import { GetTicketReportingOverviewUseCase } from './reporting/use-cases/get-ticket-reporting-overview.use-case';
import { TicketAuditService } from './ticketing/ticket-audit.service';
import { TicketArchiveSchedulerService } from './ticketing/ticket-archive-scheduler.service';
import { AddTicketAttachmentUseCase } from './ticketing/use-cases/add-ticket-attachment.use-case';
import { AddTicketCommentUseCase } from './ticketing/use-cases/add-ticket-comment.use-case';
import { ArchiveExpiredTicketsUseCase } from './ticketing/use-cases/archive-expired-tickets.use-case';
import { AssignTicketUseCase } from './ticketing/use-cases/assign-ticket.use-case';
import { ChangeTicketPriorityUseCase } from './ticketing/use-cases/change-ticket-priority.use-case';
import { ChangeTicketStatusUseCase } from './ticketing/use-cases/change-ticket-status.use-case';
import { CreateIncidentUseCase } from './ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from './ticketing/use-cases/create-request.use-case';
import { DeleteTicketAttachmentUseCase } from './ticketing/use-cases/delete-ticket-attachment.use-case';
import { DeleteTicketCommentUseCase } from './ticketing/use-cases/delete-ticket-comment.use-case';
import { DeleteTicketUseCase } from './ticketing/use-cases/delete-ticket.use-case';
import { GetTicketByIdUseCase } from './ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketAttachmentsUseCase } from './ticketing/use-cases/list-ticket-attachments.use-case';
import { ListTicketCommentsUseCase } from './ticketing/use-cases/list-ticket-comments.use-case';
import { ListTicketHistoryUseCase } from './ticketing/use-cases/list-ticket-history.use-case';
import { SearchTicketsUseCase } from './ticketing/use-cases/search-tickets.use-case';
import { SuggestTicketDraftUseCase } from './ticketing/use-cases/suggest-ticket-draft.use-case';
import { UpdateTicketUseCase } from './ticketing/use-cases/update-ticket.use-case';

const referentialUseCases = [
  ListCategoriesUseCase,
  ListChannelsUseCase,
  ListCisUseCase,
  ListCiTypesUseCase,
  ListGroupsUseCase,
  ListPrioritiesUseCase,
  GetReferentialCatalogUseCase,
  ManageCategoriesUseCase,
  ManageChannelsUseCase,
  ManageCisUseCase,
  ManageCiTypesUseCase,
  ManageGroupsUseCase,
  ManagePrioritiesUseCase,
];

const ticketingUseCases = [
  TicketAuditService,
  TicketArchiveSchedulerService,
  ArchiveExpiredTicketsUseCase,
  CreateIncidentUseCase,
  CreateRequestUseCase,
  AssignTicketUseCase,
  ChangeTicketPriorityUseCase,
  ChangeTicketStatusUseCase,
  SearchTicketsUseCase,
  SuggestTicketDraftUseCase,
  GetTicketByIdUseCase,
  ListTicketCommentsUseCase,
  AddTicketCommentUseCase,
  DeleteTicketCommentUseCase,
  DeleteTicketUseCase,
  ListTicketAttachmentsUseCase,
  AddTicketAttachmentUseCase,
  DeleteTicketAttachmentUseCase,
  ListTicketHistoryUseCase,
  UpdateTicketUseCase,
];

const planningUseCases = [
  CreatePlanningTaskUseCase,
  DeletePlanningTaskUseCase,
  ListPlanningTasksUseCase,
  UpdatePlanningTaskUseCase,
];

const knowledgeUseCases = [
  AddKnowledgeArticleAttachmentUseCase,
  CreateKnowledgeArticleUseCase,
  DeleteKnowledgeArticleUseCase,
  DeleteKnowledgeArticleAttachmentUseCase,
  GetKnowledgeArticleUseCase,
  ListKnowledgeArticleAttachmentsUseCase,
  ListKnowledgeArticlesUseCase,
  ToggleKnowledgeArticleLikeUseCase,
  UpdateKnowledgeArticleUseCase,
];

const groupChatUseCases = [
  CreateGroupChatMessageUseCase,
  ListGroupChatMessagesUseCase,
];

const notificationUseCases = [
  TicketNotificationService,
  DeleteAllNotificationsUseCase,
  DeleteNotificationUseCase,
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
];

@Module({
  imports: [ScheduleModule.forRoot(), InfrastructureModule],
  providers: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
    GetUserLicenseUseCase,
    CreateAdminUserUseCase,
    DeleteAdminUserUseCase,
    ListAdminUsersUseCase,
    RegisterRequesterUseCase,
    UpdateAdminUserUseCase,
    UpdateAdminUserGroupsUseCase,
    UpdateAdminUserStatusUseCase,
    UpdateUserLicenseUseCase,
    GetAgentPerformanceReportUseCase,
    GetTicketReportingBreakdownUseCase,
    GetTicketReportingOverviewUseCase,
    ...notificationUseCases,
    ...groupChatUseCases,
    ...knowledgeUseCases,
    ...planningUseCases,
    ...referentialUseCases,
    ...ticketingUseCases,
  ],
  exports: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
    GetUserLicenseUseCase,
    CreateAdminUserUseCase,
    DeleteAdminUserUseCase,
    ListAdminUsersUseCase,
    RegisterRequesterUseCase,
    UpdateAdminUserUseCase,
    UpdateAdminUserGroupsUseCase,
    UpdateAdminUserStatusUseCase,
    UpdateUserLicenseUseCase,
    GetAgentPerformanceReportUseCase,
    GetTicketReportingBreakdownUseCase,
    GetTicketReportingOverviewUseCase,
    ...notificationUseCases,
    ...groupChatUseCases,
    ...knowledgeUseCases,
    ...planningUseCases,
    ...referentialUseCases,
    ...ticketingUseCases,
  ],
})
export class ApplicationModule {}
