import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { AuthController } from './http/auth/auth.controller';
import { BearerAuthGuard } from './http/auth/bearer-auth.guard';
import { HealthController } from './http/health/health.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [HealthController, AuthController],
  providers: [BearerAuthGuard],
})
export class PresentationModule {}
