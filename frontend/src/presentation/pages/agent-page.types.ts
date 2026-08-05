import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { IncidentSeverity } from '../../domain/ticketing/incident-severity';
import type { TicketCommentSnapshot } from '../../domain/ticketing/ticket-comment';
import type { RequestType } from '../../domain/ticketing/request-type';

export type AgentPageProps = {
  section:
    | 'ARCHIVES'
    | 'ARCHIVE_DETAIL'
    | 'INCIDENT_CREATE'
    | 'MY_TICKETS'
    | 'REQUEST_CREATE'
    | 'LIST'
    | 'DETAIL';
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
  | 'REQUESTER';

export type IncidentLookupSearchField =
  | 'IDENTIFIER'
  | 'FIRST_NAME'
  | 'LAST_NAME'
  | 'GROUP'
  | 'NAME'
  | 'SERIAL_NUMBER'
  | 'STATUS'
  | 'TYPE';

export type TicketListSearchField =
  | 'TITLE'
  | 'REQUESTER'
  | 'TECHNICIAN'
  | 'GROUP';

export type TicketDetailSectionKey =
  | 'ACTORS'
  | 'ATTACHMENTS'
  | 'HISTORY'
  | 'TICKET';

export type TicketDetailLookupKind =
  | 'ASSIGNEE'
  | 'ASSIGNMENT_GROUP'
  | 'EQUIPMENT'
  | 'REQUESTER';

export type IncidentDraftState = {
  assignmentGroupId: string;
  assignedToUserId: string;
  categoryId: string;
  channelId: string;
  ciId: string;
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
  priorityId: string;
  requestedForUserId: string;
  rootCause: string;
  title: string;
  urgency: IncidentSeverity;
  workaround: string;
};

export type CommentDraftState = {
  body: string;
};

export type TicketChatMessage = TicketCommentSnapshot & {
  isSeedDescription?: boolean;
};

export type AttachmentDraftState = {
  files: File[];
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
