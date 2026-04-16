import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AdminUserWriteRepository,
  type CreateAdminUserRecord,
  type UpdateAdminUserRecord,
} from '../../application/auth/repositories/admin-user-write.repository';
import { type AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { UserRole } from '../../domain/auth/user-role';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseCreatedAuthUser = {
  id?: string;
  user?: {
    id?: string;
  };
};

type SupabaseUserRow = {
  display_name: string | null;
  first_name: string | null;
  group_id: string | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string;
};

@Injectable()
export class SupabaseAdminUserWriteRepository implements AdminUserWriteRepository {
  async createUser(record: CreateAdminUserRecord): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user creation configuration is incomplete.',
      );
    }

    const authUserId = await createSupabaseAuthUser(
      config.supabaseUrl,
      supabaseApiKey,
      record,
    );

    return upsertPublicUser(config.supabaseUrl, supabaseApiKey, {
      displayName: buildDisplayName(record),
      email: record.email,
      firstName: record.firstName,
      groupId: record.groupId,
      id: authUserId,
      isActive: true,
      lastName: record.lastName,
      role: record.role,
    });
  }

  async updateUser(
    userId: string,
    record: UpdateAdminUserRecord,
  ): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user update configuration is incomplete.',
      );
    }

    await updateSupabaseAuthUser(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
      record,
    );

    return upsertPublicUser(config.supabaseUrl, supabaseApiKey, {
      displayName: buildDisplayName(record),
      email: record.email,
      firstName: record.firstName,
      groupId: record.groupId,
      id: userId,
      isActive: true,
      lastName: record.lastName,
      role: record.role,
    });
  }
}

async function createSupabaseAuthUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  record: CreateAdminUserRecord,
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: record.email,
        email_confirm: true,
        password: record.password,
        user_metadata: {
          first_name: record.firstName,
          last_name: record.lastName,
          role: record.role,
        },
      }),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase auth user creation is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase auth user creation returned status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as SupabaseCreatedAuthUser;
  const userId = payload.id ?? payload.user?.id;

  if (!userId) {
    throw new ServiceUnavailableException(
      'Supabase auth user creation did not return a user id.',
    );
  }

  return userId;
}

async function updateSupabaseAuthUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  record: UpdateAdminUserRecord,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: record.email,
        user_metadata: {
          first_name: record.firstName,
          last_name: record.lastName,
          role: record.role,
        },
      }),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase auth user update is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase auth user update returned status ${response.status}.`,
    );
  }
}

async function upsertPublicUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  record: {
    displayName: string | null;
    email: string | null;
    firstName: string | null;
    groupId: string | null;
    id: string;
    isActive: boolean;
    lastName: string | null;
    role: UserRole;
  },
): Promise<AdminUserSummary> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        display_name: record.displayName,
        email: record.email,
        first_name: record.firstName,
        group_id: record.groupId,
        id: record.id,
        is_active: record.isActive,
        last_name: record.lastName,
        role: record.role,
      }),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase public user synchronization is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase public user synchronization returned status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as
    | SupabaseUserRow[]
    | SupabaseUserRow;
  const row = Array.isArray(payload) ? payload[0] : payload;

  return {
    displayName: row.display_name,
    email: record.email,
    firstName: row.first_name,
    groupId: row.group_id,
    id: row.id,
    isActive: row.is_active,
    lastName: row.last_name,
    role: resolveUserRole(row.role),
  };
}

function buildDisplayName(record: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string | null {
  const displayName = [record.firstName, record.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return displayName || record.email;
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
