export interface BackendRuntimeConfig {
  corsOrigin: string | boolean;
  host: string;
  maxBillableUsers: number | null;
  nodeEnv: string;
  port: number;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}

export function getBackendRuntimeConfig(): BackendRuntimeConfig {
  return {
    corsOrigin: process.env.CORS_ORIGIN ?? true,
    host: process.env.HOST ?? '127.0.0.1',
    maxBillableUsers: parseOptionalPositiveInteger(
      process.env.MAX_BILLABLE_USERS,
    ),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
  };
}

function parseOptionalPositiveInteger(
  value: string | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}
