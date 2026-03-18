import { Module } from '@nestjs/common';
import { GetAuthSetupUseCase } from './auth/use-cases/get-auth-setup.use-case';
import { GetHealthUseCase } from './health/use-cases/get-health.use-case';

@Module({
  providers: [GetHealthUseCase, GetAuthSetupUseCase],
  exports: [GetHealthUseCase, GetAuthSetupUseCase],
})
export class ApplicationModule {}
