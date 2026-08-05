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
  resolutionDueAt: string | null;
  responseDueAt: string | null;
  requestedForUserId: string | null;
  rootCause: string | null;
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
  resolutionDueAt: string | null;
  responseDueAt: string | null;
  requestedForUserId: string | null;
  requestType: RequestType;
  approvalStatus: RequestApprovalStatus | null;
  title: string;
};

export type UpdateTicketAssignmentRecord = {
  assignedToUserId: string | null;
  assignmentGroupId: string | null;
};

export type UpdateTicketPriorityRecord = {
  priorityId: string;
  resolutionDueAt: string | null;
  responseDueAt: string | null;
};

export type UpdateTicketStatusRecord = {
  resolutionDueAt?: string | null;
  slaPausedAt?: string | null;
  slaPausedDurationMs?: number;
  status: TicketStatus;
};

export type UpdateTicketRecord = {
  categoryId: string;
  channelId: string | null;
  ciId: string | null;
  description: string;
  incident:
    | {
        impact: IncidentSeverity;
        rootCause: string | null;
        urgency: IncidentSeverity;
        workaround: string | null;
      }
    | null
    | undefined;
  priorityId: string | null;
  requestedForUserId: string | null;
  resolutionDueAt: string | null;
  responseDueAt: string | null;
  title: string;
};

export abstract class TicketWriteRepository {
  abstract createIncident(
    record: CreateIncidentRecord,
  ): Promise<CreatedIncident>;

  abstract createRequest(record: CreateRequestRecord): Promise<CreatedRequest>;

  abstract deleteTicket(ticketId: string): Promise<void>;

  abstract archiveClosedTicketsBefore(cutoffIso: string): Promise<number>;

  abstract updateAssignment(
    ticketId: string,
    record: UpdateTicketAssignmentRecord,
  ): Promise<void>;

  abstract updateStatus(
    ticketId: string,
    record: UpdateTicketStatusRecord,
  ): Promise<void>;

  abstract updatePriority(
    ticketId: string,
    record: UpdateTicketPriorityRecord,
  ): Promise<void>;

  abstract updateTicket(
    ticketId: string,
    record: UpdateTicketRecord,
  ): Promise<void>;
}
