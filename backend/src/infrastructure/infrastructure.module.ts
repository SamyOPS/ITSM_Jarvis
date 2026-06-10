import { Module } from '@nestjs/common';
import { AdminUserReadRepository } from '../application/auth/repositories/admin-user-read.repository';
import { AdminUserWriteRepository } from '../application/auth/repositories/admin-user-write.repository';
import { UserAssignmentProfileRepository } from '../application/auth/repositories/user-assignment-profile.repository';
import { GroupChatMessageRepository } from '../application/group-chat/repositories/group-chat-message.repository';
import { ReferentialCategoryReadRepository } from '../application/referentials/repositories/referential-category-read.repository';
import { ReferentialCategoryWriteRepository } from '../application/referentials/repositories/referential-category-write.repository';
import { ReferentialChannelReadRepository } from '../application/referentials/repositories/referential-channel-read.repository';
import { ReferentialChannelWriteRepository } from '../application/referentials/repositories/referential-channel-write.repository';
import { ReferentialCiReadRepository } from '../application/referentials/repositories/referential-ci-read.repository';
import { ReferentialCiTypeReadRepository } from '../application/referentials/repositories/referential-ci-type-read.repository';
import { ReferentialCiTypeWriteRepository } from '../application/referentials/repositories/referential-ci-type-write.repository';
import { ReferentialCiWriteRepository } from '../application/referentials/repositories/referential-ci-write.repository';
import { ReferentialGroupReadRepository } from '../application/referentials/repositories/referential-group-read.repository';
import { ReferentialGroupWriteRepository } from '../application/referentials/repositories/referential-group-write.repository';
import { ReferentialPriorityReadRepository } from '../application/referentials/repositories/referential-priority-read.repository';
import { ReferentialPriorityWriteRepository } from '../application/referentials/repositories/referential-priority-write.repository';
import { PlanningTaskRepository } from '../application/planning/repositories/planning-task.repository';
import { KnowledgeArticleRepository } from '../application/knowledge/repositories/knowledge-article.repository';
import { TicketAttachmentReadRepository } from '../application/ticketing/repositories/ticket-attachment-read.repository';
import { TicketAttachmentWriteRepository } from '../application/ticketing/repositories/ticket-attachment-write.repository';
import { TicketCommentReadRepository } from '../application/ticketing/repositories/ticket-comment-read.repository';
import { TicketCommentWriteRepository } from '../application/ticketing/repositories/ticket-comment-write.repository';
import { TicketHistoryWriteRepository } from '../application/ticketing/repositories/ticket-history-write.repository';
import { TicketHistoryReadRepository } from '../application/ticketing/repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../application/ticketing/repositories/ticket-read.repository';
import { TicketWriteRepository } from '../application/ticketing/repositories/ticket-write.repository';
import { SupabaseAdminUserReadRepository } from './auth/supabase-admin-user-read.repository';
import { SupabaseAdminUserWriteRepository } from './auth/supabase-admin-user-write.repository';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';
import { SupabaseUserAssignmentProfileRepository } from './auth/supabase-user-assignment-profile.repository';
import { SupabaseGroupChatMessageRepository } from './group-chat/supabase-group-chat-message.repository';
import { SupabaseReferentialReadRepository } from './referentials/supabase-referential-read.repository';
import { SupabasePlanningTaskRepository } from './planning/supabase-planning-task.repository';
import { SupabaseKnowledgeArticleRepository } from './knowledge/supabase-knowledge-article.repository';
import { SupabaseTicketWriteRepository } from './ticketing/supabase-ticket-write.repository';

const referentialRepositoryBindings = [
  ReferentialCategoryReadRepository,
  ReferentialCategoryWriteRepository,
  ReferentialChannelReadRepository,
  ReferentialChannelWriteRepository,
  ReferentialCiReadRepository,
  ReferentialCiWriteRepository,
  ReferentialCiTypeReadRepository,
  ReferentialCiTypeWriteRepository,
  ReferentialGroupReadRepository,
  ReferentialGroupWriteRepository,
  ReferentialPriorityReadRepository,
  ReferentialPriorityWriteRepository,
].map((provide) => ({
  provide,
  useExisting: SupabaseReferentialReadRepository,
}));

@Module({
  providers: [
    SupabaseTokenValidatorService,
    SupabaseAdminUserReadRepository,
    SupabaseAdminUserWriteRepository,
    SupabaseUserAssignmentProfileRepository,
    SupabaseGroupChatMessageRepository,
    SupabaseReferentialReadRepository,
    SupabasePlanningTaskRepository,
    SupabaseKnowledgeArticleRepository,
    SupabaseTicketWriteRepository,
    ...referentialRepositoryBindings,
    {
      provide: GroupChatMessageRepository,
      useExisting: SupabaseGroupChatMessageRepository,
    },
    {
      provide: KnowledgeArticleRepository,
      useExisting: SupabaseKnowledgeArticleRepository,
    },
    {
      provide: PlanningTaskRepository,
      useExisting: SupabasePlanningTaskRepository,
    },
    {
      provide: TicketWriteRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketReadRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketCommentReadRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketCommentWriteRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketAttachmentReadRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketAttachmentWriteRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketHistoryWriteRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketHistoryReadRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: AdminUserReadRepository,
      useExisting: SupabaseAdminUserReadRepository,
    },
    {
      provide: AdminUserWriteRepository,
      useExisting: SupabaseAdminUserWriteRepository,
    },
    {
      provide: UserAssignmentProfileRepository,
      useExisting: SupabaseUserAssignmentProfileRepository,
    },
  ],
  exports: [
    SupabaseTokenValidatorService,
    ...referentialRepositoryBindings.map(({ provide }) => provide),
    AdminUserReadRepository,
    AdminUserWriteRepository,
    UserAssignmentProfileRepository,
    GroupChatMessageRepository,
    KnowledgeArticleRepository,
    PlanningTaskRepository,
    TicketReadRepository,
    TicketWriteRepository,
    TicketCommentReadRepository,
    TicketCommentWriteRepository,
    TicketAttachmentReadRepository,
    TicketAttachmentWriteRepository,
    TicketHistoryWriteRepository,
    TicketHistoryReadRepository,
  ],
})
export class InfrastructureModule {}
