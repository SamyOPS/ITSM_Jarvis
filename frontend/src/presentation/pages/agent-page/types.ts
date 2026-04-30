import type { AuthSessionSnapshot } from '../../../domain/auth/auth-session';
import type { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import type { RequestType } from '../../../domain/ticketing/request-type';

export type AgentPageSection =
  | 'ARCHIVES'
  | 'ARCHIVE_DETAIL'
  | 'ASSIGNED_TO_ME'
  | 'INCIDENT_CREATE'
  | 'MY_TICKETS'
  | 'REQUEST_CREATE'
  | 'UNASSIGNED_TICKETS'
  | 'LIST'
  | 'DETAIL';

export type AgentPageProps = {
  section: AgentPageSection;
  session: AuthSessionSnapshot;
  ticketId?: string;
};

export type TicketMode = 'INCIDENT' | 'REQUEST';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentLookupKind =
  | 'ASSIGNEE'
  | 'ASSIGNMENT_GROUP'
  | 'INCIDENT_EQUIPMENT'
  | 'REQUEST_EQUIPMENT'
  | 'REQUESTER';

export type IncidentLookupSearchField =
  | 'IDENTIFIER'
  | 'FIRST_NAME'
  | 'LAST_NAME'
  | 'GROUP'
  | 'LEVEL'
  | 'NAME'
  | 'SERIAL_NUMBER'
  | 'STATUS'
  | 'TYPE';

export type TicketListSearchField = 'TITLE' | 'REQUESTER' | 'TECHNICIAN';

export type IncidentDraftState = {
  assignmentGroupId: string;
  assignedToUserId: string;
  categoryId: string;
  channelId: string;
  ciId: string;
  comment: string;
  description: string;
  impact: '' | IncidentSeverity;
  requestedForUserId: string;
  title: string;
  urgency: '' | IncidentSeverity;
};

export type RequestDraftState = {
  assignmentGroupId: string;
  assignedToUserId: string;
  categoryId: string;
  channelId: string;
  ciId: string;
  comment: string;
  description: string;
  priorityId: string;
  requestedForUserId: string;
  requestType: '' | RequestType;
  title: string;
};

export type AssignmentDraftState = {
  assignedToUserId: string;
  assignmentGroupId: string;
};

export type TicketEditDraftState = {
  categoryId: string;
  channelId: string;
  ciId: string;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId: string;
  rootCause: string;
  title: string;
  urgency: IncidentSeverity;
  workaround: string;
};

export type CommentDraftState = {
  body: string;
  isInternal: boolean;
};

export type AttachmentDraftState = {
  file: File | null;
};

export type IncidentValidationErrors = Partial<
  Record<keyof IncidentDraftState, string>
>;

export type RequestValidationErrors = Partial<
  Record<keyof RequestDraftState, string>
>;

export type TicketSearchFiltersState = {
  categoryId: string;
  priorityId: string;
  q: string;
  searchField: TicketListSearchField;
  sortBy: 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'OPERATIONAL_PRIORITY';
  status: '' | TicketStatus;
  type: '' | TicketMode;
};
