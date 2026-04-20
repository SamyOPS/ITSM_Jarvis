import type { IncidentSeverity } from './incident-severity';
import type { RequestType } from './request-type';
export type TicketDetailSnapshot = {
  incident: {
    impact: IncidentSeverity;
    rootCause: string | null;
    ticketId: string;
    urgency: IncidentSeverity;
    workaround: string | null;
  } | null;
  priorityName: string | null;
  request: {
    approvalStatus: string | null;
    fulfilledAt: string | null;
    requestType: RequestType;
    ticketId: string;
  } | null;
  ticket: {
    assignedToUserId: string | null;
    assignmentGroupId: string | null;
    archivedAt: string | null;
    categoryId: string;
    channelId: string | null;
    ciId: string | null;
    createdAt: string;
    createdByUserId: string;
    description: string;
    id: string;
    number: string;
    priorityId: string;
    requestedForUserId: string | null;
    serviceId: string | null;
    status: string;
    title: string;
    type: string;
  };
};
