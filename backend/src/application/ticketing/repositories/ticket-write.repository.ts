import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestApprovalStatus } from '../../../domain/ticketing/request-approval-status';
import { RequestType } from '../../../domain/ticketing/request-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';

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

export type CreateRequestRecord = {
  categoryId: string;
  channelId: string | null;
  ciId: string | null;
  createdByUserId: string;
  description: string;
  priorityId: string;
  priorityName: PriorityName;
  requestedForUserId: string | null;
  requestType: RequestType;
  approvalStatus: RequestApprovalStatus | null;
  serviceId: string | null;
  title: string;
};

export type UpdateTicketAssignmentRecord = {
  assignedToUserId: string | null;
  assignmentGroupId: string | null;
};

export abstract class TicketWriteRepository {
  abstract createIncident(
    record: CreateIncidentRecord,
  ): Promise<CreatedIncident>;

  abstract createRequest(record: CreateRequestRecord): Promise<CreatedRequest>;

  abstract updateAssignment(
    ticketId: string,
    record: UpdateTicketAssignmentRecord,
  ): Promise<void>;

  abstract updateStatus(ticketId: string, status: TicketStatus): Promise<void>;
}
