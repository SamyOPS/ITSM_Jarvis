import { IncidentSeverity } from '../../domain/ticketing/incident-severity';
import { PriorityName } from '../../domain/ticketing/priority-name';

const INCIDENT_PRIORITY_MATRIX: Record<
  IncidentSeverity,
  Record<IncidentSeverity, PriorityName>
> = {
  [IncidentSeverity.LOW]: {
    [IncidentSeverity.LOW]: PriorityName.LOW,
    [IncidentSeverity.MEDIUM]: PriorityName.MEDIUM,
    [IncidentSeverity.HIGH]: PriorityName.HIGH,
  },
  [IncidentSeverity.MEDIUM]: {
    [IncidentSeverity.LOW]: PriorityName.MEDIUM,
    [IncidentSeverity.MEDIUM]: PriorityName.MEDIUM,
    [IncidentSeverity.HIGH]: PriorityName.HIGH,
  },
  [IncidentSeverity.HIGH]: {
    [IncidentSeverity.LOW]: PriorityName.HIGH,
    [IncidentSeverity.MEDIUM]: PriorityName.HIGH,
    [IncidentSeverity.HIGH]: PriorityName.CRITICAL,
  },
};

export function resolveIncidentPriorityName(
  impact: IncidentSeverity,
  urgency: IncidentSeverity,
): PriorityName {
  return INCIDENT_PRIORITY_MATRIX[impact][urgency];
}
