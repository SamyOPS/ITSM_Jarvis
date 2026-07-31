import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { type AuthenticatedUser } from '../../domain/auth/authenticated-user';
import { type SupabaseUserPayload } from '../../domain/auth/supabase-user-payload';
import { resolveUserAccountStatus } from '../../domain/auth/user-account-status';
import { UserRole } from '../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseUserProfileRow = {
  account_status: string | null;
  first_name: string | null;
  is_active: boolean;
  last_name: string | null;
  role: string;
};

type SupabaseResolvedProfile = {
  firstName: string | null;
  isActive: boolean | null;
  lastName: string | null;
  role: UserRole | null;
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

    const profile = await this.fetchProfile(accessToken, payload.id);

    if (profile.isActive === false) {
      throw new UnauthorizedException('User account is inactive.');
    }

    return {
      accessToken,
      email: payload.email,
      firstName: profile.firstName,
      id: payload.id,
      lastName: profile.lastName,
      role:
        profile.role ?? this.resolveRoleFallback(payload.app_metadata?.role),
    };
  }

  private async fetchProfile(
    accessToken: string,
    userId: string | undefined,
  ): Promise<SupabaseResolvedProfile> {
    if (!userId) {
      return {
        firstName: null,
        isActive: null,
        lastName: null,
        role: null,
      };
    }

    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseAnonKey || config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      return {
        firstName: null,
        isActive: null,
        lastName: null,
        role: null,
      };
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/users`);
    url.searchParams.set(
      'select',
      'role,first_name,last_name,is_active,account_status',
    );
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
    const row = rows[0];

    if (!row) {
      return {
        firstName: null,
        isActive: null,
        lastName: null,
        role: null,
      };
    }

    return {
      firstName: row.first_name,
      isActive:
        resolveUserAccountStatus(row.account_status, row.is_active) ===
        'ACTIVE',
      lastName: row.last_name,
      role: row.role ? this.resolveRoleFallback(row.role) : null,
    };
  }

  private resolveRoleFallback(role: string | undefined): UserRole {
    if (role === UserRole.SUPER_ADMIN) {
      return UserRole.SUPER_ADMIN;
    }

    if (role === UserRole.ADMIN) {
      return UserRole.ADMIN;
    }

    if (role === UserRole.MANAGER) {
      return UserRole.MANAGER;
    }

    if (role === UserRole.AGENT) {
      return UserRole.AGENT;
    }

    return UserRole.DEMANDEUR;
  }
}
