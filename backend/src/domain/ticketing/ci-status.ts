export enum CiStatus {
  IN_SERVICE = 'IN_SERVICE',
  IN_STOCK = 'IN_STOCK',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED',
  ARCHIVED = 'ARCHIVED',
}

export const DEFAULT_CI_STATUSES = [
  CiStatus.IN_SERVICE,
  CiStatus.IN_STOCK,
  CiStatus.MAINTENANCE,
  CiStatus.LOST,
  CiStatus.OUT_OF_SERVICE,
  CiStatus.RETIRED,
  CiStatus.ARCHIVED,
] as const;
