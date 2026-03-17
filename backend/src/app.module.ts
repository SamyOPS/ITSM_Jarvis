import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { InfrastructureModule } from './infrastructure/modules/infrastructure.module';
import { PresentationModule } from './presentation/modules/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    InfrastructureModule,
    PresentationModule,
  ],
})
export class AppModule {}
