export type HealthCheckResponse = {
  status: string;
  service: string;
  message: string;
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

async function getHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return (await response.json()) as HealthCheckResponse;
}

export const apiClient = {
  baseUrl: apiBaseUrl,
  supabaseUrl,
  getHealth,
};
