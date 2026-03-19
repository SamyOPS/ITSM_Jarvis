import type { AuthSetupSnapshot } from '../../domain/auth/auth-setup';
import { getFrontendRuntimeConfig } from '../config/env';

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
