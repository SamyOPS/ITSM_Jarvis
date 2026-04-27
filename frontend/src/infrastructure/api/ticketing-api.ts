import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';
import type { CreatedRequestSnapshot } from '../../domain/ticketing/created-request';
import type { IncidentSeverity } from '../../domain/ticketing/incident-severity';
import type { TicketAttachmentSnapshot } from '../../domain/ticketing/ticket-attachment';
import type { RequestType } from '../../domain/ticketing/request-type';
import type { TicketCommentSnapshot } from '../../domain/ticketing/ticket-comment';
import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';
import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';
import { getFrontendRuntimeConfig } from '../config/env';
import { getFrontendSupabaseConfig } from '../config/supabase-env';

export type CreateIncidentPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId?: string | null;
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

export type SearchTicketsFilters = {
  categoryId?: string | null;
  includeArchived?: boolean;
  priorityId?: string | null;
  q?: string | null;
  status?: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED' | null;
  type?: 'INCIDENT' | 'REQUEST' | null;
};

export type AssignTicketPayload = {
  assignedToUserId?: string | null;
  assignmentGroupId?: string | null;
};

export type ChangeTicketStatusPayload = {
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
};

export type UpdateTicketPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact?: IncidentSeverity | null;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  serviceId?: string | null;
  title: string;
  urgency?: IncidentSeverity | null;
  workaround?: string | null;
};

export type AddTicketCommentPayload = {
  body: string;
  isInternal?: boolean;
};

export type AddTicketAttachmentPayload = {
  bucketId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  storagePath: string;
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

export async function searchTickets(
  accessToken: string,
  filters: SearchTicketsFilters,
): Promise<TicketSummarySnapshot[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const query = new URLSearchParams();

  if (filters.q?.trim()) {
    query.set('q', filters.q.trim());
  }

  if (filters.type) {
    query.set('type', filters.type);
  }

  if (filters.status) {
    query.set('status', filters.status);
  }

  if (filters.categoryId?.trim()) {
    query.set('categoryId', filters.categoryId.trim());
  }

  if (filters.priorityId?.trim()) {
    query.set('priorityId', filters.priorityId.trim());
  }

  if (filters.includeArchived) {
    query.set('includeArchived', 'true');
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${apiUrl}/tickets${suffix}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement des tickets a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketSummarySnapshot[];
}

export async function getTicketById(
  accessToken: string,
  ticketId: string,
): Promise<TicketDetailSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement du detail ticket a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketDetailSnapshot;
}

export async function deleteTicket(
  accessToken: string,
  ticketId: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `La suppression du ticket a echoue avec le statut ${response.status}`,
    );
  }
}

export async function updateTicket(
  accessToken: string,
  ticketId: string,
  payload: UpdateTicketPayload,
): Promise<TicketDetailSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}`, {
    method: 'PATCH',
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
        `La mise a jour du ticket a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketDetailSnapshot;
}

export async function getTicketComments(
  accessToken: string,
  ticketId: string,
): Promise<TicketCommentSnapshot[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}/comments`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement des commentaires a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketCommentSnapshot[];
}

export async function addTicketComment(
  accessToken: string,
  ticketId: string,
  payload: AddTicketCommentPayload,
): Promise<TicketCommentSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}/comments`, {
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
        `L ajout du commentaire a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketCommentSnapshot;
}

export async function deleteTicketComment(
  accessToken: string,
  ticketId: string,
  commentId: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(
    `${apiUrl}/tickets/${ticketId}/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `La suppression du commentaire a echoue avec le statut ${response.status}`,
    );
  }
}

export async function getTicketAttachments(
  accessToken: string,
  ticketId: string,
): Promise<TicketAttachmentSnapshot[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}/attachments`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement des pieces jointes a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketAttachmentSnapshot[];
}

export async function addTicketAttachment(
  accessToken: string,
  ticketId: string,
  payload: AddTicketAttachmentPayload,
): Promise<TicketAttachmentSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}/attachments`, {
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
        `L enregistrement de la piece jointe a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketAttachmentSnapshot;
}

export async function deleteTicketAttachment(
  accessToken: string,
  ticketId: string,
  attachmentId: string,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(
    `${apiUrl}/tickets/${ticketId}/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `La suppression de la piece jointe a echoue avec le statut ${response.status}`,
    );
  }
}

export async function uploadTicketAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
  file: File,
): Promise<void> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await fetch(
    `${supabaseConfig.url}/storage/v1/object/${bucketId}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: file,
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `L upload du fichier a echoue avec le statut ${response.status}`,
    );
  }
}

export async function downloadTicketAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
): Promise<Blob> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await fetch(
    `${supabaseConfig.url}/storage/v1/object/authenticated/${bucketId}/${encodedPath}`,
    {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement du fichier a echoue avec le statut ${response.status}`,
    );
  }

  return await response.blob();
}

export async function deleteTicketAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
): Promise<void> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await fetch(
    `${supabaseConfig.url}/storage/v1/object/${bucketId}/${encodedPath}`,
    {
      method: 'DELETE',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `La suppression du fichier a echoue avec le statut ${response.status}`,
    );
  }
}

export async function assignTicket(
  accessToken: string,
  ticketId: string,
  payload: AssignTicketPayload,
): Promise<TicketDetailSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}/assign`, {
    method: 'PATCH',
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
        `L assignation du ticket a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketDetailSnapshot;
}

export async function changeTicketStatus(
  accessToken: string,
  ticketId: string,
  payload: ChangeTicketStatusPayload,
): Promise<TicketDetailSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}/tickets/${ticketId}/status`, {
    method: 'PATCH',
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
        `Le changement de statut a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as TicketDetailSnapshot;
}
