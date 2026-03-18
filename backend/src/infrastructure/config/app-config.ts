export interface BackendRuntimeConfig {
  corsOrigin: string | boolean;
}

export function getBackendRuntimeConfig(): BackendRuntimeConfig {
  return {
    corsOrigin: process.env.CORS_ORIGIN ?? true,
  };
}
