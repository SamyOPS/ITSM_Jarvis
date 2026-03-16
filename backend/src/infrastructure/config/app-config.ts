export interface BackendRuntimeConfig {
  corsOrigin: string;
  host: string;
  port: number;
}

function parsePort(rawPort: string | undefined): number {
  const fallbackPort = 3000;

  if (!rawPort) {
    return fallbackPort;
  }

  const parsedPort = Number(rawPort);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return fallbackPort;
  }

  return parsedPort;
}

export function getBackendRuntimeConfig(): BackendRuntimeConfig {
  return {
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    host: process.env.HOST ?? '127.0.0.1',
    port: parsePort(process.env.PORT),
  };
}
