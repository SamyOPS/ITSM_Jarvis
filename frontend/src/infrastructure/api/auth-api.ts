import type { AuthenticatedUser } from '../../domain/auth/authenticated-user';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { AuthSetupSnapshot } from '../../domain/auth/auth-setup';
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
  const supabaseConfig = getFrontendSupabaseConfig();

  const response = await fetch(
    `${supabaseConfig.url}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseConfig.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase login failed with status ${response.status}`);
  }

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
    throw new Error(
      `Current user lookup failed with status ${response.status}`,
    );
  }

  return (await response.json()) as AuthenticatedUser;
}
