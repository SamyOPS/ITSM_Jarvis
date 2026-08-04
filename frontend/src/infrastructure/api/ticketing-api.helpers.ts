import { getFrontendRuntimeConfig } from '../config/env';

type TicketingRequestOptions = {
  body?: unknown;
  cache?: RequestCache;
  method?: string;
};

export async function ticketingJsonRequest<TResponse>(
  accessToken: string,
  path: string,
  errorMessage: string,
  options: TicketingRequestOptions = {},
): Promise<TResponse> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${apiUrl}${path}`, {
    cache: options.cache,
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `${errorMessage} avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TResponse;
}

export async function ticketingVoidRequest(
  accessToken: string,
  path: string,
  errorMessage: string,
  options: TicketingRequestOptions = {},
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${apiUrl}${path}`, {
    cache: options.cache,
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `${errorMessage} avec le statut ${response.status}`,
    );
  }
}

export async function ticketingMultipartRequest<TResponse>(
  accessToken: string,
  path: string,
  errorMessage: string,
  body: FormData,
): Promise<TResponse> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `${errorMessage} avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TResponse;
}

export function encodeStoragePath(storagePath: string): string {
  return storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
