import { Module } from '@nestjs/common';
import { ReferentialCategoryReadRepository } from '../application/referentials/repositories/referential-category-read.repository';
import { ReferentialChannelReadRepository } from '../application/referentials/repositories/referential-channel-read.repository';
import { ReferentialCiReadRepository } from '../application/referentials/repositories/referential-ci-read.repository';
import { ReferentialCiTypeReadRepository } from '../application/referentials/repositories/referential-ci-type-read.repository';
import { ReferentialGroupReadRepository } from '../application/referentials/repositories/referential-group-read.repository';
import { ReferentialPriorityReadRepository } from '../application/referentials/repositories/referential-priority-read.repository';
import { ReferentialServiceReadRepository } from '../application/referentials/repositories/referential-service-read.repository';
import { TicketWriteRepository } from '../application/ticketing/repositories/ticket-write.repository';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';
import { SupabaseReferentialReadRepository } from './referentials/supabase-referential-read.repository';
import { SupabaseTicketWriteRepository } from './ticketing/supabase-ticket-write.repository';

@Module({
  providers: [
    SupabaseTokenValidatorService,
    SupabaseReferentialReadRepository,
    SupabaseTicketWriteRepository,
    {
      provide: ReferentialCategoryReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialChannelReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialCiReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialCiTypeReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialGroupReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialPriorityReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialServiceReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: TicketWriteRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
  ],
  exports: [
    SupabaseTokenValidatorService,
    ReferentialCategoryReadRepository,
    ReferentialChannelReadRepository,
    ReferentialCiReadRepository,
    ReferentialCiTypeReadRepository,
    ReferentialGroupReadRepository,
    ReferentialPriorityReadRepository,
    ReferentialServiceReadRepository,
    TicketWriteRepository,
  ],
})
export class InfrastructureModule {}
