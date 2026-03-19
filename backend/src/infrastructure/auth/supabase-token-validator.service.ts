import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { type AuthenticatedUser } from '../../domain/auth/authenticated-user';
import { type SupabaseUserPayload } from '../../domain/auth/supabase-user-payload';
import { UserRole } from '../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../config/app-config';

@Injectable()
export class SupabaseTokenValidatorService {
  async validate(accessToken: string): Promise<AuthenticatedUser> {
    const config = getBackendRuntimeConfig();

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new InternalServerErrorException(
        'Supabase auth configuration is incomplete.',
      );
    }

    const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    const payload = (await response.json()) as SupabaseUserPayload;

    if (!payload.id || !payload.email) {
      throw new UnauthorizedException('Supabase user payload is incomplete.');
    }

    return {
      accessToken,
      email: payload.email,
      id: payload.id,
      role: this.resolveRole(payload.app_metadata?.role),
    };
  }

  private resolveRole(role: string | undefined): UserRole {
    if (role === UserRole.ADMIN) {
      return UserRole.ADMIN;
    }

    if (role === UserRole.AGENT) {
      return UserRole.AGENT;
    }

    return UserRole.USER;
  }
}
