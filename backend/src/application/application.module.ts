import { Module } from '@nestjs/common';
import { GetHealthUseCase } from './health/use-cases/get-health.use-case';

@Module({
  providers: [GetHealthUseCase],
  exports: [GetHealthUseCase],
})
export class ApplicationModule {}
