import { type PriorityName } from './priority-name';
import { type TicketStatus } from './ticket-status';
import { type TicketType } from './ticket-type';

export interface TicketSummary {
  assignedToUserId: string | null;
  assignmentGroupId: string | null;
  createdAt: string;
  id: string;
  number: string;
  priority: PriorityName;
  status: TicketStatus;
  title: string;
  type: TicketType;
}
