import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationModule } from '../application/application.module';
import { AuthController } from './http/auth/auth.controller';
import { BearerAuthGuard } from './http/auth/bearer-auth.guard';
import { HealthController } from './http/health/health.controller';
import { RolesGuard } from './http/auth/roles.guard';

@Module({
  imports: [ApplicationModule],
  controllers: [HealthController, AuthController],
  providers: [BearerAuthGuard, RolesGuard, Reflector],
})
export class PresentationModule {}
