export type TicketSummarySnapshot = {
  assignedToUserId: string | null;
  assignmentGroupId: string | null;
  categoryId: string;
  channelId: string | null;
  ciId: string | null;
  createdAt: string;
  createdByUserId: string;
  id: string;
  number: string;
  priorityId: string;
  priorityName: string | null;
  requestedForUserId: string | null;
  serviceId: string | null;
  status: string;
  title: string;
  type: string;
};
