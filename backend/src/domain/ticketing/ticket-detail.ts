import { Incident } from './incident';
import { PriorityName } from './priority-name';
import { RequestTicket } from './request';
import { Ticket } from './ticket';

export class TicketDetail {
  constructor(
    public readonly ticket: Ticket,
    public readonly priorityName: PriorityName | null,
    public readonly incident: Incident | null,
    public readonly request: RequestTicket | null,
  ) {}
}
