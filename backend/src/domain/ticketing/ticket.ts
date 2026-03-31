import { TicketStatus } from './ticket-status';
import { TicketType } from './ticket-type';

export class Ticket {
  constructor(
    public readonly id: string,
    public readonly number: string,
    public readonly type: TicketType,
    public readonly status: TicketStatus,
    public readonly title: string,
    public readonly description: string,
    public readonly priorityId: string,
    public readonly categoryId: string,
    public readonly createdByUserId: string,
    public readonly requestedForUserId: string | null,
    public readonly serviceId: string | null,
    public readonly channelId: string | null,
    public readonly assignmentGroupId: string | null,
    public readonly assignedToUserId: string | null,
    public readonly ciId: string | null,
    public readonly createdAt: string,
  ) {}
}
