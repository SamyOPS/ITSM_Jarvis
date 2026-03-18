export interface FrontendRuntimeConfig {
  apiUrl: string;
  appEnv: string;
}

export function getFrontendRuntimeConfig(): FrontendRuntimeConfig {
  return {
    apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  };
}
