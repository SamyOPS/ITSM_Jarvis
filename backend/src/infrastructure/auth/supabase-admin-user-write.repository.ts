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
  email: string | null;
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
      groupIds: record.groupIds,
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
      groupIds: record.groupIds,
      id: userId,
      isActive: true,
      lastName: record.lastName,
      role: record.role,
    });
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user status configuration is incomplete.',
      );
    }

    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          is_active: isActive,
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();

      throw new BadRequestException(
        message ||
          `Supabase public user status update returned status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as SupabaseUserRow[];
    const row = payload[0];

    if (!row) {
      throw new BadRequestException('User does not exist.');
    }

    return mapUserRow(row, row.email);
  }

  async updateUserGroups(
    userId: string,
    groupIds: string[],
  ): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user group configuration is incomplete.',
      );
    }

    await replaceUserGroups(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
      groupIds,
    );

    const row = await getPublicUserById(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
    );

    return mapUserRow(row, row.email, groupIds);
  }

  async deleteUser(userId: string): Promise<void> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user deletion configuration is incomplete.',
      );
    }

    await deleteSupabaseAuthUser(config.supabaseUrl, supabaseApiKey, userId);
    await deletePublicUser(config.supabaseUrl, supabaseApiKey, userId);
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

async function deleteSupabaseAuthUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
      },
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase auth user deletion is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase auth user deletion returned status ${response.status}.`,
    );
  }
}

async function deletePublicUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          Prefer: 'return=minimal',
        },
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase public user deletion is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase public user deletion returned status ${response.status}.`,
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
    groupId?: string | null;
    groupIds?: string[];
    id: string;
    isActive: boolean;
    lastName: string | null;
    role: UserRole;
  },
): Promise<AdminUserSummary> {
  let response: Response;
  const body: Record<string, unknown> = {
    display_name: record.displayName,
    email: record.email,
    first_name: record.firstName,
    id: record.id,
    is_active: record.isActive,
    last_name: record.lastName,
    role: record.role,
  };

  if (record.groupId !== undefined && record.groupIds === undefined) {
    body.group_id = record.groupId;
  }

  try {
    response = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(body),
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

  if (record.groupIds !== undefined) {
    await replaceUserGroups(
      supabaseUrl,
      supabaseApiKey,
      record.id,
      record.groupIds,
    );
  }

  return mapUserRow(row, record.email, record.groupIds);
}

async function getPublicUserById(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<SupabaseUserRow> {
  const query = new URLSearchParams({
    id: `eq.${userId}`,
    limit: '1',
    select:
      'id,email,display_name,first_name,last_name,role,group_id,is_active',
  });

  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/rest/v1/users?${query.toString()}`, {
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase public user lookup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase public user lookup returned status ${response.status}.`,
    );
  }

  const rows = (await response.json()) as SupabaseUserRow[];
  const row = rows[0];

  if (!row) {
    throw new BadRequestException('User does not exist.');
  }

  return row;
}

async function replaceUserGroups(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  groupIds: string[],
): Promise<void> {
  let deleteResponse: Response;

  try {
    deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_groups?user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          Prefer: 'return=minimal',
        },
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase user group synchronization is unreachable.',
    );
  }

  if (!deleteResponse.ok) {
    const message = await deleteResponse.text();

    throw new BadRequestException(
      message ||
        `Supabase user group cleanup returned status ${deleteResponse.status}.`,
    );
  }

  if (groupIds.length === 0) {
    return;
  }

  for (const [index, groupId] of groupIds.entries()) {
    let insertResponse: Response;

    try {
      insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_groups`, {
        method: 'POST',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          group_id: groupId,
          is_primary: index === 0,
          user_id: userId,
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Supabase user group synchronization is unreachable.',
      );
    }

    if (!insertResponse.ok) {
      const message = await insertResponse.text();

      throw new BadRequestException(
        message ||
          `Supabase user group synchronization returned status ${insertResponse.status}.`,
      );
    }
  }
}

function mapUserRow(
  row: SupabaseUserRow,
  email: string | null,
  groupIds?: string[],
): AdminUserSummary {
  return {
    displayName: row.display_name,
    email,
    firstName: row.first_name,
    groupId: groupIds ? (groupIds[0] ?? null) : row.group_id,
    groupIds: groupIds ?? (row.group_id ? [row.group_id] : []),
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
