export interface FrontendRuntimeConfig {
  apiUrl: string;
  appEnv: string;
}

const DEFAULT_API_URL = 'http://localhost:3000';

export function getFrontendRuntimeConfig(): FrontendRuntimeConfig {
  return {
    apiUrl: normalizeApiUrl(import.meta.env.VITE_API_URL),
    appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  };
}

export function normalizeApiUrl(apiUrl: string | undefined): string {
  const trimmedApiUrl = apiUrl?.trim() ?? '';
  const normalizedApiUrl = trimmedApiUrl.replace(/\/+$/, '');

  return normalizedApiUrl || DEFAULT_API_URL;
}
