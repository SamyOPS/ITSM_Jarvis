import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { HealthController } from './http/health/health.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [HealthController],
})
export class PresentationModule {}
