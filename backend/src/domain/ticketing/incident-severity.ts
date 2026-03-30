export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export const DEFAULT_INCIDENT_SEVERITIES = [
  IncidentSeverity.LOW,
  IncidentSeverity.MEDIUM,
  IncidentSeverity.HIGH,
] as const;
