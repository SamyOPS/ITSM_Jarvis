import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AdminUserReadRepository } from '../../application/auth/repositories/admin-user-read.repository';
import { type AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { UserRole } from '../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseAdminUserRow = {
  display_name: string | null;
  first_name: string | null;
  group_id: string | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string;
};

type SupabaseAuthUsersPayload = {
  users?: Array<{
    email?: string | null;
    id?: string;
  }>;
};

@Injectable()
export class SupabaseAdminUserReadRepository implements AdminUserReadRepository {
  async listUsers(): Promise<AdminUserSummary[]> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseServiceRoleKey || config.supabaseAnonKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user directory configuration is incomplete.',
      );
    }

    const query = new URLSearchParams({
      order: 'display_name.asc.nullslast,role.asc',
      select: 'id,display_name,first_name,last_name,role,group_id,is_active',
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
        'Supabase admin user directory lookup is unreachable.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Supabase admin user directory lookup returned status ${response.status}.`,
      );
    }

    const rows = (await response.json()) as SupabaseAdminUserRow[];

    const emailsByUserId = await listAuthEmailsByUserId(
      config.supabaseUrl,
      supabaseApiKey,
    );

    return rows.map((row) => ({
      displayName: row.display_name,
      email: emailsByUserId.get(row.id) ?? null,
      firstName: row.first_name,
      groupId: row.group_id,
      id: row.id,
      isActive: row.is_active,
      lastName: row.last_name,
      role: resolveUserRole(row.role),
    }));
  }
}

async function listAuthEmailsByUserId(
  supabaseUrl: string,
  supabaseApiKey: string,
): Promise<Map<string, string>> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        Accept: 'application/json',
      },
    });
  } catch {
    return new Map();
  }

  if (!response.ok) {
    return new Map();
  }

  const payload = (await response.json()) as SupabaseAuthUsersPayload;
  const emailsByUserId = new Map<string, string>();

  for (const user of payload.users ?? []) {
    if (user.id && user.email) {
      emailsByUserId.set(user.id, user.email);
    }
  }

  return emailsByUserId;
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
