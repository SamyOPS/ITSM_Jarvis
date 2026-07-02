import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

export type ReportsPageProps = {
  session: AuthSessionSnapshot;
};

export type PeriodPreset =
  | 'CUSTOM'
  | 'THIS_MONTH'
  | 'THIS_WEEK'
  | 'THIS_YEAR'
  | 'TODAY';

export type ReportsFilterState = {
  assignedToUserId: string;
  assignmentGroupId: string;
  categoryId: string;
  from: string;
  periodPreset: PeriodPreset;
  priorityId: string;
  status: '' | 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  to: string;
  type: '' | 'INCIDENT' | 'REQUEST';
};

export type ReportsView = 'DASHBOARD' | 'PERSONAL' | 'GROUP';

export type PersonalTicketSort =
  | 'CREATED_AT_ASC'
  | 'CREATED_AT_DESC'
  | 'OPERATIONAL_PRIORITY';

export type PersonalTicketColumn =
  | 'ASSIGNED_TO'
  | 'CATEGORY'
  | 'ID'
  | 'PRIORITY'
  | 'REQUESTER'
  | 'STATUS'
  | 'TITLE';

export type PersonalEquipmentItem = {
  displayId: string;
  id: string;
  model: string;
  name: string;
  serialNumber: string;
  type: string;
};

export type GroupChatMessage = {
  authorName: string;
  authorUserId?: string;
  body: string;
  createdAt: string;
  groupId: string;
  id: string;
};

export type ReportsPlanningContext =
  | { type: 'GROUP'; groupId: string }
  | { type: 'PERSONAL' };
