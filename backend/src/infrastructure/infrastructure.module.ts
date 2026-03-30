import { Module } from '@nestjs/common';
import { ReferentialCategoryReadRepository } from '../application/referentials/repositories/referential-category-read.repository';
import { ReferentialChannelReadRepository } from '../application/referentials/repositories/referential-channel-read.repository';
import { ReferentialCiTypeReadRepository } from '../application/referentials/repositories/referential-ci-type-read.repository';
import { ReferentialGroupReadRepository } from '../application/referentials/repositories/referential-group-read.repository';
import { ReferentialPriorityReadRepository } from '../application/referentials/repositories/referential-priority-read.repository';
import { ReferentialServiceReadRepository } from '../application/referentials/repositories/referential-service-read.repository';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';
import { SupabaseReferentialReadRepository } from './referentials/supabase-referential-read.repository';

@Module({
  providers: [
    SupabaseTokenValidatorService,
    SupabaseReferentialReadRepository,
    {
      provide: ReferentialCategoryReadRepository,
      useExisting: SupabaseReferentialReadRepository,
    },
    {
      provide: ReferentialChannelReadRepository,
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
  ],
  exports: [
    SupabaseTokenValidatorService,
    ReferentialCategoryReadRepository,
    ReferentialChannelReadRepository,
    ReferentialCiTypeReadRepository,
    ReferentialGroupReadRepository,
    ReferentialPriorityReadRepository,
    ReferentialServiceReadRepository,
  ],
})
export class InfrastructureModule {}
