import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';

export type CreateIncidentDto = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  title: string;
  urgency: IncidentSeverity;
  workaround?: string | null;
};
