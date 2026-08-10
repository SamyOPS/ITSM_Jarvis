import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestType } from '../../../domain/ticketing/request-type';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export type SuggestTicketDraftCommand = {
  attachments?: TicketDraftAttachmentInput[];
  categories?: string[];
  channels?: string[];
  currentMode?: TicketType | null;
  priorities?: string[];
  requesters?: string[];
  userInput: string;
};

export type TicketDraftAttachmentInput = {
  data: Buffer | string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type TicketDraftAssistantResponse = {
  action: 'ASK_QUESTION' | 'SUGGEST_TICKET';
  question: string | null;
  suggestion: TicketDraftSuggestion | null;
};

export type TicketDraftSuggestion = {
  categoryName: string | null;
  channelName: string | null;
  confidence: number;
  description: string;
  impact: IncidentSeverity | null;
  priorityName: PriorityName | null;
  requesterName: string | null;
  requesterScope: 'SELF' | 'OTHER' | null;
  requestType: RequestType | null;
  title: string;
  type: TicketType;
  urgency: IncidentSeverity | null;
};
