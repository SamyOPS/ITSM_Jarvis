import { Module } from '@nestjs/common';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';
import { SupabaseReferentialReaderService } from './referentials/supabase-referential-reader.service';

@Module({
  providers: [SupabaseTokenValidatorService, SupabaseReferentialReaderService],
  exports: [SupabaseTokenValidatorService, SupabaseReferentialReaderService],
})
export class InfrastructureModule {}
