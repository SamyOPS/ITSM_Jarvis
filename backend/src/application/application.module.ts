import { Module } from '@nestjs/common';
import { GetAuthSetupUseCase } from './auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from './auth/use-cases/get-authenticated-user.use-case';
import { GetHealthUseCase } from './health/use-cases/get-health.use-case';
import { GetReferentialCatalogUseCase } from './referentials/use-cases/get-referential-catalog.use-case';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { ListChannelsUseCase } from './references/use-cases/list-channels.use-case';
import { ListCategoriesUseCase } from './references/use-cases/list-categories.use-case';
import { ListPrioritiesUseCase } from './references/use-cases/list-priorities.use-case';
import { ListServicesUseCase } from './references/use-cases/list-services.use-case';
import { ListSupportGroupsUseCase } from './references/use-cases/list-support-groups.use-case';
import { ListTicketsUseCase } from './ticketing/use-cases/list-tickets.use-case';

@Module({
  imports: [InfrastructureModule],
  providers: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
    ListSupportGroupsUseCase,
    ListCategoriesUseCase,
    ListServicesUseCase,
    ListChannelsUseCase,
    ListPrioritiesUseCase,
    ListTicketsUseCase,
  ],
  exports: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
    ListSupportGroupsUseCase,
    ListCategoriesUseCase,
    ListServicesUseCase,
    ListChannelsUseCase,
    ListPrioritiesUseCase,
    ListTicketsUseCase,
  ],
})
export class ApplicationModule {}
