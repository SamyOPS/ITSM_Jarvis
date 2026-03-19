import { Module } from '@nestjs/common';
import { GetAuthSetupUseCase } from './auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from './auth/use-cases/get-authenticated-user.use-case';
import { GetHealthUseCase } from './health/use-cases/get-health.use-case';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  providers: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
  ],
  exports: [GetHealthUseCase, GetAuthSetupUseCase, GetAuthenticatedUserUseCase],
})
export class ApplicationModule {}
