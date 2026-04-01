import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../application/auth/repositories/user-assignment-profile.repository';
import { UserAssignmentProfile } from '../../domain/auth/user-assignment-profile';
import { UserRole } from '../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseUserAssignmentRow = {
  group_id: string | null;
  id: string;
  is_active: boolean;
  role: string;
};

@Injectable()
export class SupabaseUserAssignmentProfileRepository implements UserAssignmentProfileRepository {
  async getById(userId: string): Promise<UserAssignmentProfile | null> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseServiceRoleKey || config.supabaseAnonKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase user assignment profile configuration is incomplete.',
      );
    }

    const query = new URLSearchParams({
      id: `eq.${userId}`,
      limit: '1',
      select: 'id,role,group_id,is_active',
    });

    let response: Response;

    try {
      response = await fetch(
        `${config.supabaseUrl}/rest/v1/users?${query.toString()}`,
        {
          headers: {
            apikey: supabaseApiKey,
            Authorization: `Bearer ${supabaseApiKey}`,
            Accept: 'application/json',
          },
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Supabase user assignment profile lookup is unreachable.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Supabase user assignment profile lookup returned status ${response.status}.`,
      );
    }

    const rows = (await response.json()) as SupabaseUserAssignmentRow[];
    const [row] = rows;

    if (!row) {
      return null;
    }

    return {
      groupId: row.group_id,
      id: row.id,
      isActive: row.is_active,
      role: resolveUserRole(row.role),
    };
  }
}

function resolveUserRole(role: string): UserRole {
  if (role === 'ADMIN') {
    return UserRole.ADMIN;
  }

  if (role === 'AGENT') {
    return UserRole.AGENT;
  }

  return UserRole.DEMANDEUR;
}
