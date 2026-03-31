import { PriorityName } from './priority-name';
import { RequestTicket } from './request';
import { Ticket } from './ticket';

export class CreatedRequest {
  constructor(
    public readonly ticket: Ticket,
    public readonly request: RequestTicket,
    public readonly priorityName: PriorityName,
  ) {}
}
