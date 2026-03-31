import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { PriorityName } from '../../../domain/ticketing/priority-name';

export type CreateIncidentRecord = {
  categoryId: string;
  channelId: string | null;
  ciId: string | null;
  createdByUserId: string;
  description: string;
  impact: IncidentSeverity;
  priorityId: string;
  priorityName: PriorityName;
  requestedForUserId: string | null;
  rootCause: string | null;
  serviceId: string | null;
  title: string;
  urgency: IncidentSeverity;
  workaround: string | null;
};

export abstract class TicketWriteRepository {
  abstract createIncident(
    record: CreateIncidentRecord,
  ): Promise<CreatedIncident>;
}
