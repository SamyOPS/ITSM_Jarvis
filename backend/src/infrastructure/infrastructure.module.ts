import { Module } from '@nestjs/common';
import { ReferentialCategoryReadRepository } from '../application/referentials/repositories/referential-category-read.repository';
import { ReferentialCategoryWriteRepository } from '../application/referentials/repositories/referential-category-write.repository';
import { ReferentialChannelReadRepository } from '../application/referentials/repositories/referential-channel-read.repository';
import { ReferentialChannelWriteRepository } from '../application/referentials/repositories/referential-channel-write.repository';
import { ReferentialCiReadRepository } from '../application/referentials/repositories/referential-ci-read.repository';
import { ReferentialCiTypeReadRepository } from '../application/referentials/repositories/referential-ci-type-read.repository';
import { ReferentialCiTypeWriteRepository } from '../application/referentials/repositories/referential-ci-type-write.repository';
import { ReferentialCiWriteRepository } from '../application/referentials/repositories/referential-ci-write.repository';
import { ReferentialGroupReadRepository } from '../application/referentials/repositories/referential-group-read.repository';
import { ReferentialGroupWriteRepository } from '../application/referentials/repositories/referential-group-write.repository';
import { ReferentialPriorityReadRepository } from '../application/referentials/repositories/referential-priority-read.repository';
import { ReferentialPriorityWriteRepository } from '../application/referentials/repositories/referential-priority-write.repository';
import { ReferentialServiceReadRepository } from '../application/referentials/repositories/referential-service-read.repository';
import { ReferentialServiceWriteRepository } from '../application/referentials/repositories/referential-service-write.repository';
import { TicketReadRepository } from '../application/ticketing/repositories/ticket-read.repository';
import { TicketWriteRepository } from '../application/ticketing/repositories/ticket-write.repository';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';
import { SupabaseReferentialReadRepository } from './referentials/supabase-referential-read.repository';
import { SupabaseTicketWriteRepository } from './ticketing/supabase-ticket-write.repository';

const referentialRepositoryBindings = [
  ReferentialCategoryReadRepository,
  ReferentialCategoryWriteRepository,
  ReferentialChannelReadRepository,
  ReferentialChannelWriteRepository,
  ReferentialCiReadRepository,
  ReferentialCiWriteRepository,
  ReferentialCiTypeReadRepository,
  ReferentialCiTypeWriteRepository,
  ReferentialGroupReadRepository,
  ReferentialGroupWriteRepository,
  ReferentialPriorityReadRepository,
  ReferentialPriorityWriteRepository,
  ReferentialServiceReadRepository,
  ReferentialServiceWriteRepository,
].map((provide) => ({
  provide,
  useExisting: SupabaseReferentialReadRepository,
}));

@Module({
  providers: [
    SupabaseTokenValidatorService,
    SupabaseReferentialReadRepository,
    SupabaseTicketWriteRepository,
    ...referentialRepositoryBindings,
    {
      provide: TicketWriteRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
    {
      provide: TicketReadRepository,
      useExisting: SupabaseTicketWriteRepository,
    },
  ],
  exports: [
    SupabaseTokenValidatorService,
    ...referentialRepositoryBindings.map(({ provide }) => provide),
    TicketReadRepository,
    TicketWriteRepository,
  ],
})
export class InfrastructureModule {}
