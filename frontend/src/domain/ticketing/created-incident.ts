import type { IncidentSeverity } from './incident-severity';

export type CreatedIncidentSnapshot = {
  incident: {
    impact: IncidentSeverity;
    rootCause: string | null;
    ticketId: string;
    urgency: IncidentSeverity;
    workaround: string | null;
  };
  priorityName: string;
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
    resolutionDueAt: string | null;
    resolutionSlaStatus: string | null;
    responseDueAt: string | null;
    responseSlaStatus: string | null;
    serviceId: string | null;
    status: string;
    title: string;
    type: string;
  };
};
