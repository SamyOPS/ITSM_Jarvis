export enum CiStatus {
  IN_SERVICE = 'IN_SERVICE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export const DEFAULT_CI_STATUSES = [
  CiStatus.IN_SERVICE,
  CiStatus.MAINTENANCE,
  CiStatus.OUT_OF_SERVICE,
] as const;
