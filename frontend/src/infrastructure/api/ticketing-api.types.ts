import type { IncidentSeverity } from '../../domain/ticketing/incident-severity';
import type { RequestType } from '../../domain/ticketing/request-type';

export type CreateIncidentPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId?: string | null;
  title: string;
  urgency: IncidentSeverity;
};

export type CreateRequestPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  priorityId: string;
  requestedForUserId?: string | null;
  requestType?: RequestType | null;
  title: string;
};

export type SuggestTicketDraftPayload = {
  categories?: string[];
  currentMode?: 'INCIDENT' | 'REQUEST' | null;
  priorities?: string[];
  userInput: string;
};

export type TicketDraftSuggestion = {
  categoryName: string | null;
  confidence: number;
  description: string;
  impact: IncidentSeverity | null;
  priorityName: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  requestType: RequestType | null;
  title: string;
  type: 'INCIDENT' | 'REQUEST';
  urgency: IncidentSeverity | null;
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

export type ChangeTicketPriorityPayload = {
  priorityId: string;
};

export type UpdateTicketPayload = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description?: string;
  impact?: IncidentSeverity | null;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  title?: string;
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
