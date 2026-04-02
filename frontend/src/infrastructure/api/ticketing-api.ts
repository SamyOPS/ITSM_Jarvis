import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';
import type { CreatedRequestSnapshot } from '../../domain/ticketing/created-request';
import type { IncidentSeverity } from '../../domain/ticketing/incident-severity';
import type { RequestType } from '../../domain/ticketing/request-type';
import { getFrontendRuntimeConfig } from '../config/env';

export type CreateIncidentPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact: IncidentSeverity;
  serviceId?: string | null;
  title: string;
  urgency: IncidentSeverity;
};

export type CreateRequestPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  priorityId: string;
  requestType?: RequestType | null;
  serviceId?: string | null;
  title: string;
};

export async function createIncident(
  accessToken: string,
  payload: CreateIncidentPayload,
): Promise<CreatedIncidentSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/incidents`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `La creation de l incident a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as CreatedIncidentSnapshot;
}

export async function createRequest(
  accessToken: string,
  payload: CreateRequestPayload,
): Promise<CreatedRequestSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/requests`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `La creation de la demande a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as CreatedRequestSnapshot;
}
