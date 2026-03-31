import { IncidentSeverity } from './incident-severity';

export class Incident {
  constructor(
    public readonly ticketId: string,
    public readonly impact: IncidentSeverity,
    public readonly urgency: IncidentSeverity,
    public readonly rootCause: string | null,
    public readonly workaround: string | null,
  ) {}
}
