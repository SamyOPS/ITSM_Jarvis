import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthenticatedUser } from '../../domain/auth/authenticated-user';
import type { ProtectedApiResult } from '../../domain/auth/protected-api-result';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { AuthSetupSnapshot } from '../../domain/auth/auth-setup';
import type { UserRole } from '../../domain/auth/user-role';
import { getFrontendRuntimeConfig } from '../config/env';
import { getFrontendSupabaseConfig } from '../config/supabase-env';

export async function fetchAuthSetup(): Promise<AuthSetupSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/setup`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Auth setup failed with status ${response.status}`);
  }

  return (await response.json()) as AuthSetupSnapshot;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthSessionSnapshot> {
  const response = await fetchSupabaseToken('password', { email, password });

  if (!response.ok) {
    throw new Error(`Supabase login failed with status ${response.status}`);
  }

  return buildAuthSessionFromTokenResponse(response);
}

export async function refreshAuthSession(
  refreshToken: string,
): Promise<AuthSessionSnapshot> {
  const response = await fetchSupabaseToken('refresh_token', {
    refresh_token: refreshToken,
  });

  if (!response.ok) {
    throw new Error(`Supabase refresh failed with status ${response.status}`);
  }

  return buildAuthSessionFromTokenResponse(response);
}

export async function fetchCurrentUser(
  accessToken: string,
): Promise<AuthenticatedUser> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Current user lookup failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AuthenticatedUser;
}

export async function fetchProtectedAgentArea(
  accessToken: string,
): Promise<ProtectedApiResult> {
  return fetchProtectedArea('/auth/agent-area', accessToken);
}

export async function fetchProtectedAdminArea(
  accessToken: string,
): Promise<ProtectedApiResult> {
  return fetchProtectedArea('/auth/admin-area', accessToken);
}

export async function fetchAdminUsers(
  accessToken: string,
): Promise<AdminUserSummary[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/admin/users`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Admin users lookup failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AdminUserSummary[];
}

export type CreateAdminUserPayload = {
  email: string;
  firstName: string | null;
  groupId: string | null;
  lastName: string | null;
  password: string;
  role: UserRole;
};

export type UpdateAdminUserPayload = {
  email: string;
  firstName: string | null;
  groupId: string | null;
  lastName: string | null;
  role: UserRole;
};

export async function createAdminUser(
  accessToken: string,
  payload: CreateAdminUserPayload,
): Promise<AdminUserSummary> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/admin/users`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Admin user creation failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AdminUserSummary;
}

export async function updateAdminUser(
  accessToken: string,
  userId: string,
  payload: UpdateAdminUserPayload,
): Promise<AdminUserSummary> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Admin user update failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AdminUserSummary;
}

export async function updateAdminUserStatus(
  accessToken: string,
  userId: string,
  isActive: boolean,
): Promise<AdminUserSummary> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Admin user status update failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AdminUserSummary;
}

export async function deleteAdminUser(
  accessToken: string,
  userId: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Admin user deletion failed with status ${response.status}`,
    );
  }
}

export async function fetchUserDirectory(
  accessToken: string,
): Promise<AdminUserSummary[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/auth/users`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Users directory lookup failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AdminUserSummary[];
}

async function fetchProtectedArea(
  path: '/auth/agent-area' | '/auth/admin-area',
  accessToken: string,
): Promise<ProtectedApiResult> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Protected API call failed with ${response.status}`,
    );
  }

  return (await response.json()) as ProtectedApiResult;
}

async function buildAuthSessionFromTokenResponse(
  response: Response,
): Promise<AuthSessionSnapshot> {
  const payload = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };
  const user = await fetchCurrentUser(payload.access_token);

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    user,
  };
}

function fetchSupabaseToken(
  grantType: 'password' | 'refresh_token',
  payload: Record<string, string>,
): Promise<Response> {
  const supabaseConfig = getFrontendSupabaseConfig();

  return fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
