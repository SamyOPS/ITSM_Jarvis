import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import { getFrontendRuntimeConfig } from '../config/env';

export type AdminReferentialKind =
  | 'categories'
  | 'channels'
  | 'ci-types'
  | 'cis'
  | 'groups'
  | 'priorities'
  | 'services';

export async function fetchReferentialCatalog(): Promise<ReferentialCatalogSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/referentials`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Le chargement des referentiels a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as ReferentialCatalogSnapshot;
}

export async function createAdminReferential(
  kind: AdminReferentialKind,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await sendAdminReferentialMutation(kind, accessToken, 'POST', payload);
}

export async function updateAdminReferential(
  kind: AdminReferentialKind,
  id: string,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await sendAdminReferentialMutation(kind, accessToken, 'PATCH', payload, id);
}

export async function deleteAdminReferential(
  kind: AdminReferentialKind,
  id: string,
  accessToken: string,
): Promise<void> {
  await sendAdminReferentialMutation(
    kind,
    accessToken,
    'DELETE',
    undefined,
    id,
  );
}

async function sendAdminReferentialMutation(
  kind: AdminReferentialKind,
  accessToken: string,
  method: 'DELETE' | 'PATCH' | 'POST',
  payload?: Record<string, unknown>,
  id?: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const path = id
    ? `${apiUrl}/admin/referentials/${kind}/${id}`
    : `${apiUrl}/admin/referentials/${kind}`;
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `L action admin sur les referentiels a echoue avec le statut ${response.status}`,
    );
  }
}
