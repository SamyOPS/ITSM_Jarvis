import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationModule } from '../application/application.module';
import { AuthController } from './http/auth/auth.controller';
import { BearerAuthGuard } from './http/auth/bearer-auth.guard';
import { RolesGuard } from './http/auth/roles.guard';
import { HealthController } from './http/health/health.controller';
import { AdminReferentialsController } from './http/referentials/admin-referentials.controller';
import { ReferentialsController } from './http/referentials/referentials.controller';
import { TicketsController } from './http/tickets/tickets.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [
    HealthController,
    AuthController,
    ReferentialsController,
    AdminReferentialsController,
    TicketsController,
  ],
  providers: [BearerAuthGuard, RolesGuard, Reflector],
})
export class PresentationModule {}
