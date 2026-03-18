import type { UserRole } from './user-role';

export interface AuthSetupSnapshot {
  provider: 'supabase';
  ready: boolean;
  roles: readonly UserRole[];
  supabase: {
    hasAnonKey: boolean;
    hasServiceRoleKey: boolean;
    hasUrl: boolean;
  };
}
