import { Module } from '@nestjs/common';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';
import {
  CATEGORY_REPOSITORY,
  CHANNEL_REPOSITORY,
  PRIORITY_REPOSITORY,
  SERVICE_REPOSITORY,
  SUPPORT_GROUP_REPOSITORY,
} from '../domain/references/reference-repository.tokens';
import { TICKET_REPOSITORY } from '../domain/ticketing/ticket-repository.token';
import { InMemoryCategoryRepository } from './persistence/in-memory/in-memory-category.repository';
import { InMemoryChannelRepository } from './persistence/in-memory/in-memory-channel.repository';
import { InMemoryPriorityRepository } from './persistence/in-memory/in-memory-priority.repository';
import { InMemoryServiceRepository } from './persistence/in-memory/in-memory-service.repository';
import { InMemorySupportGroupRepository } from './persistence/in-memory/in-memory-support-group.repository';
import { InMemoryTicketRepository } from './persistence/in-memory/in-memory-ticket.repository';

@Module({
  providers: [
    SupabaseTokenValidatorService,
    InMemorySupportGroupRepository,
    InMemoryCategoryRepository,
    InMemoryServiceRepository,
    InMemoryChannelRepository,
    InMemoryPriorityRepository,
    InMemoryTicketRepository,
    {
      provide: SUPPORT_GROUP_REPOSITORY,
      useExisting: InMemorySupportGroupRepository,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useExisting: InMemoryCategoryRepository,
    },
    {
      provide: SERVICE_REPOSITORY,
      useExisting: InMemoryServiceRepository,
    },
    {
      provide: CHANNEL_REPOSITORY,
      useExisting: InMemoryChannelRepository,
    },
    {
      provide: PRIORITY_REPOSITORY,
      useExisting: InMemoryPriorityRepository,
    },
    {
      provide: TICKET_REPOSITORY,
      useExisting: InMemoryTicketRepository,
    },
  ],
  exports: [
    SupabaseTokenValidatorService,
    SUPPORT_GROUP_REPOSITORY,
    CATEGORY_REPOSITORY,
    SERVICE_REPOSITORY,
    CHANNEL_REPOSITORY,
    PRIORITY_REPOSITORY,
    TICKET_REPOSITORY,
  ],
})
export class InfrastructureModule {}
