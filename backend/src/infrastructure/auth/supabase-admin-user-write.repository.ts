import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { normalizePersonName } from '../../application/auth/name-normalization';
import {
  AdminUserWriteRepository,
  type CreateAdminUserRecord,
  type UpdateAdminUserRecord,
  type UpdateUserProfilePhotoRecord,
} from '../../application/auth/repositories/admin-user-write.repository';
import { type AdminUserSummary } from '../../domain/auth/admin-user-summary';
import {
  resolveUserAccountStatus,
  type UserAccountStatus,
} from '../../domain/auth/user-account-status';
import { UserRole } from '../../domain/auth/user-role';
import { TicketHistoryEventType } from '../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseCreatedAuthUser = {
  id?: string;
  user?: {
    id?: string;
  };
};

type SupabaseUserRow = {
  account_status: string | null;
  can_manage_assets: boolean | null;
  can_manage_knowledge_base: boolean | null;
  can_validate_knowledge_base: boolean | null;
  display_name: string | null;
  email: string | null;
  first_name: string | null;
  group_id: string | null;
  id: string;
  is_active: boolean;
  is_vip: boolean | null;
  last_name: string | null;
  profile_photo_url: string | null;
  role: string;
};

type SupabaseUserGroupRow = {
  group_id: string;
  id: string;
  is_primary: boolean;
};

type SupabaseTicketCleanupRow = {
  id: string;
  status: TicketStatus;
};

@Injectable()
export class SupabaseAdminUserWriteRepository implements AdminUserWriteRepository {
  async createUser(record: CreateAdminUserRecord): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;
    const shouldConfirmEmail = record.emailConfirmed ?? true;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user creation configuration is incomplete.',
      );
    }

    if (!shouldConfirmEmail && !config.supabaseAnonKey) {
      throw new ServiceUnavailableException(
        'Supabase requester signup configuration is incomplete.',
      );
    }

    const authUserId = shouldConfirmEmail
      ? await createSupabaseAuthUser(config.supabaseUrl, supabaseApiKey, record)
      : await signUpSupabaseAuthUser(
          config.supabaseUrl,
          config.supabaseAnonKey,
          record,
        );

    if (!shouldConfirmEmail) {
      await resendSignupConfirmationEmail(
        config.supabaseUrl,
        config.supabaseAnonKey,
        record.email,
        resolveEmailRedirectTo(config.corsOrigin),
      );
    }

    return upsertPublicUser(config.supabaseUrl, supabaseApiKey, {
      displayName: buildDisplayName(record),
      email: record.email,
      firstName: record.firstName,
      groupId: record.role === UserRole.DEMANDEUR ? null : record.groupId,
      groupIds: record.role === UserRole.DEMANDEUR ? [] : record.groupIds,
      id: authUserId,
      accountStatus: 'ACTIVE',
      canManageAssets: record.canManageAssets,
      canManageKnowledgeBase: record.canManageKnowledgeBase,
      canValidateKnowledgeBase: record.canValidateKnowledgeBase,
      isActive: true,
      isVip: record.isVip,
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

    const updatedUser = await upsertPublicUser(
      config.supabaseUrl,
      supabaseApiKey,
      {
        displayName: buildDisplayName(record),
        email: record.email,
        firstName: record.firstName,
        groupId: record.role === UserRole.DEMANDEUR ? null : record.groupId,
        groupIds: record.role === UserRole.DEMANDEUR ? [] : record.groupIds,
        id: userId,
        accountStatus: 'ACTIVE',
        canManageAssets: record.canManageAssets,
        canManageKnowledgeBase: record.canManageKnowledgeBase,
        canValidateKnowledgeBase: record.canValidateKnowledgeBase,
        isActive: true,
        isVip: record.isVip,
        lastName: record.lastName,
        role: record.role,
      },
    );

    if (record.role === UserRole.DEMANDEUR) {
      await cleanupRequesterOperationalState(
        config.supabaseUrl,
        supabaseApiKey,
        userId,
      );

      return {
        ...updatedUser,
        groupId: null,
        groupIds: [],
      };
    }

    return updatedUser;
  }

  async updateUserProfilePhoto(
    userId: string,
    record: UpdateUserProfilePhotoRecord,
  ): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase profile photo configuration is incomplete.',
      );
    }

    await upsertUserProfilePhoto(config.supabaseUrl, supabaseApiKey, {
      ...record,
      userId,
    });

    return updatePublicUserProfilePhoto(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
      record.publicUrl,
    );
  }

  async deleteUserProfilePhoto(userId: string): Promise<AdminUserSummary> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase profile photo configuration is incomplete.',
      );
    }

    await deleteUserProfilePhoto(config.supabaseUrl, supabaseApiKey, userId);

    return updatePublicUserProfilePhoto(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
      null,
    );
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
          account_status: isActive ? 'ACTIVE' : 'TRASHED',
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

    const row = await getPublicUserById(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
    );

    if (
      resolveUserRole(row.role) === UserRole.DEMANDEUR &&
      groupIds.length > 0
    ) {
      throw new BadRequestException(
        'Un demandeur ne peut pas etre rattache a un groupe support.',
      );
    }

    await replaceUserGroups(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
      groupIds,
    );

    const updatedRow = await getPublicUserById(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
    );

    return mapUserRow(updatedRow, updatedRow.email, groupIds);
  }

  async deleteUser(userId: string): Promise<void> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey = config.supabaseServiceRoleKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase admin user deletion configuration is incomplete.',
      );
    }

    await markUserAsDeleted(config.supabaseUrl, supabaseApiKey, userId);
    await cleanupDeletedUserOperationalState(
      config.supabaseUrl,
      supabaseApiKey,
      userId,
    );
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

async function signUpSupabaseAuthUser(
  supabaseUrl: string,
  supabaseAnonKey: string,
  record: CreateAdminUserRecord,
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          first_name: record.firstName,
          last_name: record.lastName,
          role: record.role,
        },
        email: record.email,
        password: record.password,
      }),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase requester signup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();
    const supabaseError = parseSupabaseError(message);

    if (
      response.status === 429 ||
      supabaseError.errorCode === 'over_email_send_rate_limit'
    ) {
      throw new HttpException(
        'Trop de mails ont été envoyés en peu de temps. Attends quelques minutes avant de réessayer.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new BadRequestException(
      supabaseError.message ||
        `Supabase requester signup returned status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as SupabaseCreatedAuthUser;
  const userId = payload.id ?? payload.user?.id;

  if (!userId) {
    throw new ServiceUnavailableException(
      'Supabase requester signup did not return a user id.',
    );
  }

  return userId;
}

async function resendSignupConfirmationEmail(
  supabaseUrl: string,
  supabaseAnonKey: string,
  email: string,
  emailRedirectTo: string | null,
): Promise<void> {
  let response: Response;
  const body: {
    email: string;
    options?: {
      emailRedirectTo: string;
    };
    type: 'signup';
  } = {
    email,
    type: 'signup',
  };

  if (emailRedirectTo) {
    body.options = {
      emailRedirectTo,
    };
  }

  try {
    response = await fetch(`${supabaseUrl}/auth/v1/resend`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase confirmation email resend is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();
    const supabaseError = parseSupabaseError(message);

    if (
      response.status === 429 ||
      supabaseError.errorCode === 'over_email_send_rate_limit'
    ) {
      return;
    }

    throw new BadRequestException(
      supabaseError.message ||
        `Supabase confirmation email resend returned status ${response.status}.`,
    );
  }
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

async function markUserAsDeleted(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          account_status: 'DELETED',
          group_id: null,
          is_active: false,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase public user logical deletion is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase public user logical deletion returned status ${response.status}.`,
    );
  }
}

async function upsertPublicUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  record: {
    accountStatus: UserAccountStatus;
    displayName: string | null;
    email: string | null;
    firstName: string | null;
    groupId?: string | null;
    groupIds?: string[];
    id: string;
    canManageAssets?: boolean;
    canManageKnowledgeBase?: boolean;
    canValidateKnowledgeBase?: boolean;
    isActive: boolean;
    isVip?: boolean;
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
    account_status: record.accountStatus,
    is_active: record.isActive,
    last_name: record.lastName,
    role: record.role,
  };

  if (record.isVip !== undefined) {
    body.is_vip = record.isVip;
  }

  if (record.canManageAssets !== undefined) {
    body.can_manage_assets = record.canManageAssets;
  }

  if (record.canManageKnowledgeBase !== undefined) {
    body.can_manage_knowledge_base = record.canManageKnowledgeBase;
  }

  if (record.canValidateKnowledgeBase !== undefined) {
    body.can_validate_knowledge_base = record.canValidateKnowledgeBase;
  }

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
      'id,email,display_name,first_name,last_name,role,group_id,is_active,account_status,is_vip,can_manage_assets,can_manage_knowledge_base,can_validate_knowledge_base,profile_photo_url',
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

async function upsertUserProfilePhoto(
  supabaseUrl: string,
  supabaseApiKey: string,
  record: UpdateUserProfilePhotoRecord & { userId: string },
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/user_profile_photos?on_conflict=user_id`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          bucket_id: record.bucketId,
          mime_type: record.mimeType,
          public_url: record.publicUrl,
          size_bytes: record.sizeBytes,
          storage_path: record.storagePath,
          user_id: record.userId,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase profile photo metadata update is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase profile photo metadata update returned status ${response.status}.`,
    );
  }
}

async function deleteUserProfilePhoto(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
  });
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/user_profile_photos?${query.toString()}`,
      {
        method: 'DELETE',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
        },
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase profile photo metadata deletion is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase profile photo metadata deletion returned status ${response.status}.`,
    );
  }
}

async function updatePublicUserProfilePhoto(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  profilePhotoUrl: string | null,
): Promise<AdminUserSummary> {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          profile_photo_url: profilePhotoUrl,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase public user profile photo update is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase public user profile photo update returned status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as SupabaseUserRow[];
  const row = payload[0];

  if (!row) {
    throw new BadRequestException('User does not exist.');
  }

  return mapUserRow(row, row.email);
}

async function replaceUserGroups(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  groupIds: string[],
): Promise<void> {
  const normalizedGroupIds = [
    ...new Set(groupIds.map((id) => id.trim()).filter(Boolean)),
  ];
  const existingRows = await getUserGroupRows(
    supabaseUrl,
    supabaseApiKey,
    userId,
  );
  const nextGroupIdSet = new Set(normalizedGroupIds);
  const existingGroupIdSet = new Set(existingRows.map((row) => row.group_id));

  for (const row of existingRows) {
    if (!nextGroupIdSet.has(row.group_id)) {
      await deleteUserGroupRow(supabaseUrl, supabaseApiKey, row.id);
    }
  }

  for (const groupId of normalizedGroupIds) {
    if (!existingGroupIdSet.has(groupId)) {
      await insertUserGroupRow(supabaseUrl, supabaseApiKey, userId, groupId);
    }
  }

  await updatePublicUserPrimaryGroup(
    supabaseUrl,
    supabaseApiKey,
    userId,
    normalizedGroupIds[0] ?? null,
  );

  await synchronizeUserGroupPrimaryFlags(
    supabaseUrl,
    supabaseApiKey,
    userId,
    normalizedGroupIds[0] ?? null,
  );
}

async function getUserGroupRows(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<SupabaseUserGroupRow[]> {
  const query = new URLSearchParams({
    select: 'id,group_id,is_primary',
    user_id: `eq.${userId}`,
  });
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/user_groups?${query.toString()}`,
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
      'Supabase user group lookup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase user group lookup returned status ${response.status}.`,
    );
  }

  return (await response.json()) as SupabaseUserGroupRow[];
}

async function insertUserGroupRow(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  groupId: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/rest/v1/user_groups`, {
      method: 'POST',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        group_id: groupId,
        is_primary: false,
        user_id: userId,
      }),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase user group creation is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase user group creation returned status ${response.status}.`,
    );
  }
}

async function deleteUserGroupRow(
  supabaseUrl: string,
  supabaseApiKey: string,
  userGroupId: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/user_groups?id=eq.${encodeURIComponent(userGroupId)}`,
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
      'Supabase user group deletion is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase user group deletion returned status ${response.status}.`,
    );
  }
}

async function synchronizeUserGroupPrimaryFlags(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  primaryGroupId: string | null,
): Promise<void> {
  await updateUserGroupPrimaryFlag(
    supabaseUrl,
    supabaseApiKey,
    userId,
    primaryGroupId,
    false,
  );
  await updateUserGroupPrimaryFlag(
    supabaseUrl,
    supabaseApiKey,
    userId,
    primaryGroupId,
    true,
  );
}

async function updateUserGroupPrimaryFlag(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  primaryGroupId: string | null,
  isPrimary: boolean,
): Promise<void> {
  if (!primaryGroupId && isPrimary) {
    return;
  }

  const groupFilter = isPrimary
    ? `group_id=eq.${encodeURIComponent(primaryGroupId ?? '')}`
    : primaryGroupId
      ? `group_id=neq.${encodeURIComponent(primaryGroupId)}`
      : 'group_id=not.is.null';
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/user_groups?user_id=eq.${encodeURIComponent(userId)}&${groupFilter}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          is_primary: isPrimary,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase user group primary flag synchronization is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase user group primary flag synchronization returned status ${response.status}.`,
    );
  }
}

async function updatePublicUserPrimaryGroup(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  groupId: string | null,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          group_id: groupId,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase public user primary group synchronization is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase public user primary group synchronization returned status ${response.status}.`,
    );
  }
}

async function cleanupRequesterOperationalState(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  await deleteUserGroupsByUserId(supabaseUrl, supabaseApiKey, userId);
  await updatePublicUserPrimaryGroup(supabaseUrl, supabaseApiKey, userId, null);
  await unassignActiveTicketsForUser(supabaseUrl, supabaseApiKey, userId);
  await deleteFuturePlanningTasksForUser(supabaseUrl, supabaseApiKey, userId);
}

async function cleanupDeletedUserOperationalState(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  await deleteUserGroupsByUserId(supabaseUrl, supabaseApiKey, userId);
  await unassignOpenOrResolvedTicketsForUser(
    supabaseUrl,
    supabaseApiKey,
    userId,
  );
  await closeOpenOrResolvedRequestedTicketsForUser(
    supabaseUrl,
    supabaseApiKey,
    userId,
  );
  await deleteFuturePlanningTasksForUser(supabaseUrl, supabaseApiKey, userId);
}

async function deleteUserGroupsByUserId(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
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
      'Supabase user group cleanup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase user group cleanup returned status ${response.status}.`,
    );
  }
}

async function unassignActiveTicketsForUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;
  const query = new URLSearchParams({
    assigned_to_user_id: `eq.${userId}`,
    status: 'in.(OPEN,IN_PROGRESS,PENDING)',
  });

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/tickets?${query.toString()}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          assigned_to_user_id: null,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase ticket assignment cleanup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase ticket assignment cleanup returned status ${response.status}.`,
    );
  }
}

async function unassignOpenOrResolvedTicketsForUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;
  const query = new URLSearchParams({
    archived_at: 'is.null',
    assigned_to_user_id: `eq.${userId}`,
    status: 'in.(OPEN,IN_PROGRESS,PENDING,RESOLVED)',
  });

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/tickets?${query.toString()}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          assigned_to_user_id: null,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase deleted user ticket assignment cleanup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase deleted user ticket assignment cleanup returned status ${response.status}.`,
    );
  }
}

async function closeOpenOrResolvedRequestedTicketsForUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;
  const tickets = await listOpenOrResolvedRequestedTicketsForUser(
    supabaseUrl,
    supabaseApiKey,
    userId,
  );

  if (tickets.length === 0) {
    return;
  }

  const closedAt = new Date().toISOString();
  const query = new URLSearchParams({
    archived_at: 'is.null',
    requested_for_user_id: `eq.${userId}`,
    id: `in.(${tickets.map((ticket) => ticket.id).join(',')})`,
  });

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/tickets?${query.toString()}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          closed_at: closedAt,
          status: TicketStatus.CLOSED,
        }),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      'Supabase deleted requester ticket cleanup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase deleted requester ticket cleanup returned status ${response.status}.`,
    );
  }

  await addDeletedRequesterTicketClosureTraces(
    supabaseUrl,
    supabaseApiKey,
    userId,
    tickets,
  );
}

async function listOpenOrResolvedRequestedTicketsForUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<SupabaseTicketCleanupRow[]> {
  let response: Response;
  const query = new URLSearchParams({
    archived_at: 'is.null',
    requested_for_user_id: `eq.${userId}`,
    select: 'id,status',
    status: `in.(${[
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING,
      TicketStatus.RESOLVED,
    ].join(',')})`,
  });

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/tickets?${query.toString()}`,
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
      'Supabase deleted requester ticket lookup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase deleted requester ticket lookup returned status ${response.status}.`,
    );
  }

  const rows = (await response.json()) as SupabaseTicketCleanupRow[] | null;

  return Array.isArray(rows) ? rows : [];
}

async function addDeletedRequesterTicketClosureTraces(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  tickets: SupabaseTicketCleanupRow[],
): Promise<void> {
  await insertDeletedRequesterClosureComments(
    supabaseUrl,
    supabaseApiKey,
    userId,
    tickets,
  );
  await insertDeletedRequesterClosureHistory(
    supabaseUrl,
    supabaseApiKey,
    userId,
    tickets,
  );
}

async function insertDeletedRequesterClosureComments(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  tickets: SupabaseTicketCleanupRow[],
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/rest/v1/ticket_comments`, {
      method: 'POST',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(
        tickets.map((ticket) => ({
          author_user_id: userId,
          body: 'Ticket cloture automatiquement car le demandeur associe a ete supprime.',
          is_internal: true,
          ticket_id: ticket.id,
        })),
      ),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase deleted requester ticket comment trace is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase deleted requester ticket comment trace returned status ${response.status}.`,
    );
  }
}

async function insertDeletedRequesterClosureHistory(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
  tickets: SupabaseTicketCleanupRow[],
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${supabaseUrl}/rest/v1/ticket_history`, {
      method: 'POST',
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(
        tickets.map((ticket) => ({
          actor_user_id: userId,
          event_type: TicketHistoryEventType.STATUS_CHANGED,
          payload: {
            fromStatus: ticket.status,
            reason: 'REQUESTER_DELETED',
            toStatus: TicketStatus.CLOSED,
          },
          ticket_id: ticket.id,
        })),
      ),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Supabase deleted requester ticket history trace is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase deleted requester ticket history trace returned status ${response.status}.`,
    );
  }
}

async function deleteFuturePlanningTasksForUser(
  supabaseUrl: string,
  supabaseApiKey: string,
  userId: string,
): Promise<void> {
  let response: Response;
  const query = new URLSearchParams({
    start_at: `gte.${new Date().toISOString()}`,
    technician_id: `eq.${userId}`,
  });

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/planning_tasks?${query.toString()}`,
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
      'Supabase planning task cleanup is unreachable.',
    );
  }

  if (!response.ok) {
    const message = await response.text();

    throw new BadRequestException(
      message ||
        `Supabase planning task cleanup returned status ${response.status}.`,
    );
  }
}

function mapUserRow(
  row: SupabaseUserRow,
  email: string | null,
  groupIds?: string[],
): AdminUserSummary {
  const accountStatus = resolveUserAccountStatus(
    row.account_status,
    row.is_active,
  );

  return {
    accountStatus,
    displayName: row.display_name,
    email,
    firstName: normalizePersonName(row.first_name),
    groupId: groupIds ? (groupIds[0] ?? null) : row.group_id,
    groupIds: groupIds ?? (row.group_id ? [row.group_id] : []),
    id: row.id,
    isVip: Boolean(row.is_vip),
    isActive: accountStatus === 'ACTIVE',
    canManageAssets: Boolean(row.can_manage_assets),
    canManageKnowledgeBase: Boolean(row.can_manage_knowledge_base),
    canValidateKnowledgeBase: Boolean(row.can_validate_knowledge_base),
    lastName: normalizePersonName(row.last_name),
    profilePhotoUrl: row.profile_photo_url,
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

function resolveEmailRedirectTo(corsOrigin: string | boolean): string | null {
  if (typeof corsOrigin !== 'string') {
    return null;
  }

  const normalizedOrigin = corsOrigin.trim();

  if (!normalizedOrigin) {
    return null;
  }

  try {
    return new URL(normalizedOrigin).toString();
  } catch {
    return null;
  }
}

function resolveUserRole(role: string): UserRole {
  if (role === 'SUPER_ADMIN') {
    return UserRole.SUPER_ADMIN;
  }

  if (role === 'ADMIN') {
    return UserRole.ADMIN;
  }

  if (role === 'MANAGER') {
    return UserRole.MANAGER;
  }

  if (role === 'AGENT') {
    return UserRole.AGENT;
  }

  return UserRole.DEMANDEUR;
}

function parseSupabaseError(message: string): {
  errorCode: string | null;
  message: string | null;
} {
  if (!message) {
    return {
      errorCode: null,
      message: null,
    };
  }

  try {
    const payload = JSON.parse(message) as {
      error_code?: string;
      msg?: string;
    };

    return {
      errorCode: payload.error_code ?? null,
      message: payload.msg ?? message,
    };
  } catch {
    return {
      errorCode: null,
      message,
    };
  }
}
