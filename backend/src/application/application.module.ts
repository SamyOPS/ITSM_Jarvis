import { Module } from '@nestjs/common';
import { GetAuthSetupUseCase } from './auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from './auth/use-cases/get-authenticated-user.use-case';
import { GetHealthUseCase } from './health/use-cases/get-health.use-case';
import { GetReferentialCatalogUseCase } from './referentials/use-cases/get-referential-catalog.use-case';
import { ListCategoriesUseCase } from './referentials/use-cases/list-categories.use-case';
import { ListChannelsUseCase } from './referentials/use-cases/list-channels.use-case';
import { ListCisUseCase } from './referentials/use-cases/list-cis.use-case';
import { ListCiTypesUseCase } from './referentials/use-cases/list-ci-types.use-case';
import { ListGroupsUseCase } from './referentials/use-cases/list-groups.use-case';
import { ListPrioritiesUseCase } from './referentials/use-cases/list-priorities.use-case';
import { ListServicesUseCase } from './referentials/use-cases/list-services.use-case';
import { ManageCategoriesUseCase } from './referentials/use-cases/manage-categories.use-case';
import { ManageChannelsUseCase } from './referentials/use-cases/manage-channels.use-case';
import { ManageCisUseCase } from './referentials/use-cases/manage-cis.use-case';
import { ManageCiTypesUseCase } from './referentials/use-cases/manage-ci-types.use-case';
import { ManageGroupsUseCase } from './referentials/use-cases/manage-groups.use-case';
import { ManagePrioritiesUseCase } from './referentials/use-cases/manage-priorities.use-case';
import { ManageServicesUseCase } from './referentials/use-cases/manage-services.use-case';
import { AddTicketCommentUseCase } from './ticketing/use-cases/add-ticket-comment.use-case';
import { AssignTicketUseCase } from './ticketing/use-cases/assign-ticket.use-case';
import { ChangeTicketStatusUseCase } from './ticketing/use-cases/change-ticket-status.use-case';
import { CreateIncidentUseCase } from './ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from './ticketing/use-cases/create-request.use-case';
import { GetTicketByIdUseCase } from './ticketing/use-cases/get-ticket-by-id.use-case';
import { ListTicketCommentsUseCase } from './ticketing/use-cases/list-ticket-comments.use-case';
import { SearchTicketsUseCase } from './ticketing/use-cases/search-tickets.use-case';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

const referentialUseCases = [
  ListCategoriesUseCase,
  ListChannelsUseCase,
  ListCisUseCase,
  ListCiTypesUseCase,
  ListGroupsUseCase,
  ListPrioritiesUseCase,
  ListServicesUseCase,
  GetReferentialCatalogUseCase,
  ManageCategoriesUseCase,
  ManageChannelsUseCase,
  ManageCisUseCase,
  ManageCiTypesUseCase,
  ManageGroupsUseCase,
  ManagePrioritiesUseCase,
  ManageServicesUseCase,
];

const ticketingUseCases = [
  CreateIncidentUseCase,
  CreateRequestUseCase,
  AssignTicketUseCase,
  ChangeTicketStatusUseCase,
  SearchTicketsUseCase,
  GetTicketByIdUseCase,
  ListTicketCommentsUseCase,
  AddTicketCommentUseCase,
];

@Module({
  imports: [InfrastructureModule],
  providers: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
    ...referentialUseCases,
    ...ticketingUseCases,
  ],
  exports: [
    GetHealthUseCase,
    GetAuthSetupUseCase,
    GetAuthenticatedUserUseCase,
    ...referentialUseCases,
    ...ticketingUseCases,
  ],
})
export class ApplicationModule {}
