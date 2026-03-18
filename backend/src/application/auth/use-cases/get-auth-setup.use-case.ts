import { Injectable } from '@nestjs/common';
import { DEFAULT_USER_ROLES } from '../../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../../../infrastructure/config/app-config';

export interface AuthSetupSnapshot {
  provider: 'supabase';
  ready: boolean;
  roles: readonly string[];
  supabase: {
    hasAnonKey: boolean;
    hasServiceRoleKey: boolean;
    hasUrl: boolean;
  };
}

@Injectable()
export class GetAuthSetupUseCase {
  execute(): AuthSetupSnapshot {
    const config = getBackendRuntimeConfig();

    return {
      provider: 'supabase',
      ready:
        Boolean(config.supabaseUrl) &&
        Boolean(config.supabaseAnonKey) &&
        Boolean(config.supabaseServiceRoleKey),
      roles: DEFAULT_USER_ROLES,
      supabase: {
        hasAnonKey: Boolean(config.supabaseAnonKey),
        hasServiceRoleKey: Boolean(config.supabaseServiceRoleKey),
        hasUrl: Boolean(config.supabaseUrl),
      },
    };
  }
}
