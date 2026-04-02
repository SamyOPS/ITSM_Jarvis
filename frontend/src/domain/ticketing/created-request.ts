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
