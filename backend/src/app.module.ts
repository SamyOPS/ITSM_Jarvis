import { Module } from '@nestjs/common';

import { InfrastructureModule } from './infrastructure/modules/infrastructure.module';
import { PresentationModule } from './presentation/modules/presentation.module';

@Module({
  imports: [InfrastructureModule, PresentationModule],
})
export class AppModule {}
