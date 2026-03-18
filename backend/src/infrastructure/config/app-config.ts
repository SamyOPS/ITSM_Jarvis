export interface BackendRuntimeConfig {
  corsOrigin: string | boolean;
  host: string;
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
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
  };
}
