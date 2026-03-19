import {
  Injectable,
  ServiceUnavailableException,
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
    const supabaseApiKey =
      config.supabaseAnonKey || config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase auth configuration is incomplete on the backend.',
      );
    }

    let response: Response;

    try {
      response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Supabase auth service is unreachable from the backend.',
      );
    }

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