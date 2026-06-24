import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';
import type { CreatedRequestSnapshot } from '../../domain/ticketing/created-request';
import type { TicketAttachmentSnapshot } from '../../domain/ticketing/ticket-attachment';
import type { TicketCommentSnapshot } from '../../domain/ticketing/ticket-comment';
import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';
import type { TicketHistoryEntrySnapshot } from '../../domain/ticketing/ticket-history-entry';
import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';
import { getFrontendSupabaseConfig } from '../config/supabase-env';
import {
  encodeStoragePath,
  ticketingJsonRequest,
  ticketingVoidRequest,
} from './ticketing-api.helpers';
export type {
  AddTicketAttachmentPayload,
  AddTicketCommentPayload,
  AssignTicketPayload,
  ChangeTicketPriorityPayload,
  ChangeTicketStatusPayload,
  CreateIncidentPayload,
  CreateRequestPayload,
  SearchTicketsFilters,
  UpdateTicketPayload,
} from './ticketing-api.types';
import type {
  AddTicketAttachmentPayload,
  AddTicketCommentPayload,
  AssignTicketPayload,
  ChangeTicketPriorityPayload,
  ChangeTicketStatusPayload,
  CreateIncidentPayload,
  CreateRequestPayload,
  SearchTicketsFilters,
  UpdateTicketPayload,
} from './ticketing-api.types';

export async function createIncident(
  accessToken: string,
  payload: CreateIncidentPayload,
): Promise<CreatedIncidentSnapshot> {
  return ticketingJsonRequest<CreatedIncidentSnapshot>(
    accessToken,
    '/tickets/incidents',
    'La creation de l incident a echoue',
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function createRequest(
  accessToken: string,
  payload: CreateRequestPayload,
): Promise<CreatedRequestSnapshot> {
  return ticketingJsonRequest<CreatedRequestSnapshot>(
    accessToken,
    '/tickets/requests',
    'La creation de la demande a echoue',
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function searchTickets(
  accessToken: string,
  filters: SearchTicketsFilters,
): Promise<TicketSummarySnapshot[]> {
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
  return ticketingJsonRequest<TicketSummarySnapshot[]>(
    accessToken,
    `/tickets${suffix}`,
    'Le chargement des tickets a echoue',
  );
}

export async function getTicketById(
  accessToken: string,
  ticketId: string,
): Promise<TicketDetailSnapshot> {
  return ticketingJsonRequest<TicketDetailSnapshot>(
    accessToken,
    `/tickets/${ticketId}`,
    'Le chargement du detail ticket a echoue',
  );
}

export async function deleteTicket(
  accessToken: string,
  ticketId: string,
): Promise<void> {
  await ticketingVoidRequest(
    accessToken,
    `/tickets/${ticketId}`,
    'La suppression du ticket a echoue',
    { method: 'DELETE' },
  );
}

export async function updateTicket(
  accessToken: string,
  ticketId: string,
  payload: UpdateTicketPayload,
): Promise<TicketDetailSnapshot> {
  return ticketingJsonRequest<TicketDetailSnapshot>(
    accessToken,
    `/tickets/${ticketId}`,
    'La mise a jour du ticket a echoue',
    { method: 'PATCH', body: payload },
  );
}

export async function changeTicketPriority(
  accessToken: string,
  ticketId: string,
  payload: ChangeTicketPriorityPayload,
): Promise<TicketDetailSnapshot> {
  return ticketingJsonRequest<TicketDetailSnapshot>(
    accessToken,
    `/tickets/${ticketId}/priority`,
    'La mise a jour de la priorite du ticket a echoue',
    { method: 'PATCH', body: payload },
  );
}

export async function getTicketComments(
  accessToken: string,
  ticketId: string,
): Promise<TicketCommentSnapshot[]> {
  return ticketingJsonRequest<TicketCommentSnapshot[]>(
    accessToken,
    `/tickets/${ticketId}/comments`,
    'Le chargement des commentaires a echoue',
  );
}

export async function getTicketHistory(
  accessToken: string,
  ticketId: string,
): Promise<TicketHistoryEntrySnapshot[]> {
  return ticketingJsonRequest<TicketHistoryEntrySnapshot[]>(
    accessToken,
    `/tickets/${ticketId}/history`,
    "Le chargement de l'historique a echoue",
  );
}

export async function addTicketComment(
  accessToken: string,
  ticketId: string,
  payload: AddTicketCommentPayload,
): Promise<TicketCommentSnapshot> {
  return ticketingJsonRequest<TicketCommentSnapshot>(
    accessToken,
    `/tickets/${ticketId}/comments`,
    'L ajout du commentaire a echoue',
    { method: 'POST', body: payload },
  );
}

export async function deleteTicketComment(
  accessToken: string,
  ticketId: string,
  commentId: string,
): Promise<void> {
  await ticketingVoidRequest(
    accessToken,
    `/tickets/${ticketId}/comments/${commentId}`,
    'La suppression du commentaire a echoue',
    { method: 'DELETE' },
  );
}

export async function getTicketAttachments(
  accessToken: string,
  ticketId: string,
): Promise<TicketAttachmentSnapshot[]> {
  return ticketingJsonRequest<TicketAttachmentSnapshot[]>(
    accessToken,
    `/tickets/${ticketId}/attachments`,
    'Le chargement des pieces jointes a echoue',
    { cache: 'no-store' },
  );
}

export async function addTicketAttachment(
  accessToken: string,
  ticketId: string,
  payload: AddTicketAttachmentPayload,
): Promise<TicketAttachmentSnapshot> {
  return ticketingJsonRequest<TicketAttachmentSnapshot>(
    accessToken,
    `/tickets/${ticketId}/attachments`,
    'L enregistrement de la piece jointe a echoue',
    { method: 'POST', body: payload },
  );
}

export async function deleteTicketAttachment(
  accessToken: string,
  ticketId: string,
  attachmentId: string,
): Promise<void> {
  await ticketingVoidRequest(
    accessToken,
    `/tickets/${ticketId}/attachments/${attachmentId}`,
    'La suppression de la piece jointe a echoue',
    { method: 'DELETE' },
  );
}

export async function uploadTicketAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
  file: File,
): Promise<void> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = encodeStoragePath(storagePath);
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
  const encodedPath = encodeStoragePath(storagePath);
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
  const encodedPath = encodeStoragePath(storagePath);
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
  return ticketingJsonRequest<TicketDetailSnapshot>(
    accessToken,
    `/tickets/${ticketId}/assign`,
    'L assignation du ticket a echoue',
    { method: 'PATCH', body: payload },
  );
}

export async function changeTicketStatus(
  accessToken: string,
  ticketId: string,
  payload: ChangeTicketStatusPayload,
): Promise<TicketDetailSnapshot> {
  return ticketingJsonRequest<TicketDetailSnapshot>(
    accessToken,
    `/tickets/${ticketId}/status`,
    'Le changement de statut a echoue',
    { method: 'PATCH', body: payload },
  );
}
