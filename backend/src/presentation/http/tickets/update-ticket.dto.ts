import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';

export type UpdateTicketDto = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact?: IncidentSeverity | null;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  title: string;
  urgency?: IncidentSeverity | null;
  workaround?: string | null;
};
