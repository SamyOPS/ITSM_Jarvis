import { PriorityName } from './priority-name';
import { Incident } from './incident';
import { Ticket } from './ticket';

export class CreatedIncident {
  constructor(
    public readonly ticket: Ticket,
    public readonly incident: Incident,
    public readonly priorityName: PriorityName,
  ) {}
}
