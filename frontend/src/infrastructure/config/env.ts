export interface FrontendRuntimeConfig {
  apiUrl: string;
}

export function getFrontendRuntimeConfig(): FrontendRuntimeConfig {
  return {
    apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  };
}
