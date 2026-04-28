import type { RequestType } from './request-type';

export type CreatedRequestSnapshot = {
  priorityName: string;
  request: {
    approvalStatus: string | null;
    fulfilledAt: string | null;
    requestType: RequestType;
    ticketId: string;
  };
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
    status: string;
    title: string;
    type: string;
  };
};
