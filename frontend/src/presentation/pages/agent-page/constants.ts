import type { ReferentialCatalogSnapshot } from '../../../domain/referentials/referential-catalog';
import {
  type AssignmentDraftState,
  type AttachmentDraftState,
  type CommentDraftState,
  type IncidentDraftState,
  type RequestDraftState,
  type TicketEditDraftState,
  type TicketSearchFiltersState,
} from './types';

export const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
};

export const INITIAL_INCIDENT_DRAFT: IncidentDraftState = {
  assignmentGroupId: '',
  assignedToUserId: '',
  categoryId: '',
  channelId: '',
  ciId: '',
  comment: '',
  description: '',
  impact: '',
  requestedForUserId: '',
  title: '',
  urgency: '',
};

export const INITIAL_REQUEST_DRAFT: RequestDraftState = {
  assignmentGroupId: '',
  assignedToUserId: '',
  categoryId: '',
  channelId: '',
  ciId: '',
  comment: '',
  description: '',
  priorityId: '',
  requestedForUserId: '',
  requestType: '',
  title: '',
};

export const REQUEST_DEFAULT_CATEGORY_NAME = 'Demande';

export const INITIAL_SEARCH_FILTERS: TicketSearchFiltersState = {
  categoryId: '',
  priorityId: '',
  q: '',
  searchField: 'TITLE',
  sortBy: 'OPERATIONAL_PRIORITY',
  status: '',
  type: '',
};

export const INITIAL_ASSIGNMENT_DRAFT: AssignmentDraftState = {
  assignedToUserId: '',
  assignmentGroupId: '',
};

export const INITIAL_TICKET_EDIT_DRAFT: TicketEditDraftState = {
  categoryId: '',
  channelId: '',
  ciId: '',
  description: '',
  impact: 'MEDIUM',
  requestedForUserId: '',
  rootCause: '',
  title: '',
  urgency: 'MEDIUM',
  workaround: '',
};

export const INITIAL_COMMENT_DRAFT: CommentDraftState = {
  body: '',
  isInternal: false,
};

export const INITIAL_ATTACHMENT_DRAFT: AttachmentDraftState = {
  file: null,
};

export const TICKET_ATTACHMENTS_BUCKET_ID = 'ticket-attachments';
export const INCIDENT_LOOKUP_PAGE_SIZE = 10;
export const TICKETS_PER_PAGE = 15;
