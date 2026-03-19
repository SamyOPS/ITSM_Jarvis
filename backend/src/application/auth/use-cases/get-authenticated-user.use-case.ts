import { Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { SupabaseTokenValidatorService } from '../../../infrastructure/auth/supabase-token-validator.service';

@Injectable()
export class GetAuthenticatedUserUseCase {
  constructor(
    private readonly supabaseTokenValidatorService: SupabaseTokenValidatorService,
  ) {}

  execute(accessToken: string): Promise<AuthenticatedUser> {
    return this.supabaseTokenValidatorService.validate(accessToken);
  }
}
