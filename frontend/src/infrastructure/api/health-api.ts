import type { HealthSnapshot } from '../../domain/health/health-snapshot';
import { getFrontendRuntimeConfig } from '../config/env';

export async function fetchBackendHealth(): Promise<HealthSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/health`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return (await response.json()) as HealthSnapshot;
}
