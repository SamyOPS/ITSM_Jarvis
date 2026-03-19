import { Module } from '@nestjs/common';
import { SupabaseTokenValidatorService } from './auth/supabase-token-validator.service';

@Module({
  providers: [SupabaseTokenValidatorService],
  exports: [SupabaseTokenValidatorService],
})
export class InfrastructureModule {}
