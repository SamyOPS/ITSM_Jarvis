import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationModule } from '../application/application.module';
import { AuthController } from './http/auth/auth.controller';
import { BearerAuthGuard } from './http/auth/bearer-auth.guard';
import { GroupChatController } from './http/group-chat/group-chat.controller';
import { RolesGuard } from './http/auth/roles.guard';
import { HealthController } from './http/health/health.controller';
import { KnowledgeController } from './http/knowledge/knowledge.controller';
import { PlanningController } from './http/planning/planning.controller';
import { AdminReferentialsController } from './http/referentials/admin-referentials.controller';
import { ReferentialsController } from './http/referentials/referentials.controller';
import { ReportsController } from './http/reports/reports.controller';
import { TicketsController } from './http/tickets/tickets.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [
    HealthController,
    AuthController,
    GroupChatController,
    ReferentialsController,
    AdminReferentialsController,
    KnowledgeController,
    PlanningController,
    ReportsController,
    TicketsController,
  ],
  providers: [BearerAuthGuard, RolesGuard, Reflector],
})
export class PresentationModule {}
