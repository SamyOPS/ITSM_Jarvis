export enum PriorityName {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const DEFAULT_PRIORITY_NAMES = [
  PriorityName.LOW,
  PriorityName.MEDIUM,
  PriorityName.HIGH,
  PriorityName.CRITICAL,
] as const;
