import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { type AuthenticatedUser } from '../../domain/auth/authenticated-user';
import { type SupabaseUserPayload } from '../../domain/auth/supabase-user-payload';
import { UserRole } from '../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseUserProfileRow = {
  role: string;
};

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
      role: await this.resolveRole(accessToken, payload),
    };
  }

  private async resolveRole(
    accessToken: string,
    payload: SupabaseUserPayload,
  ): Promise<UserRole> {
    const profileRole = await this.fetchProfileRole(accessToken, payload.id);

    if (profileRole) {
      return profileRole;
    }

    return this.resolveRoleFallback(payload.app_metadata?.role);
  }

  private async fetchProfileRole(
    accessToken: string,
    userId: string | undefined,
  ): Promise<UserRole | null> {
    if (!userId) {
      return null;
    }

    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseAnonKey || config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      return null;
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/users`);
    url.searchParams.set('select', 'role');
    url.searchParams.set('id', `eq.${userId}`);
    url.searchParams.set('limit', '1');

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Supabase profile service is unreachable from the backend.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Supabase profile lookup returned status ${response.status}.`,
      );
    }

    const rows = (await response.json()) as SupabaseUserProfileRow[];
    const role = rows[0]?.role;

    return role ? this.resolveRoleFallback(role) : null;
  }

  private resolveRoleFallback(role: string | undefined): UserRole {
    if (role === UserRole.ADMIN) {
      return UserRole.ADMIN;
    }

    if (role === UserRole.AGENT) {
      return UserRole.AGENT;
    }

    return UserRole.DEMANDEUR;
  }
}
