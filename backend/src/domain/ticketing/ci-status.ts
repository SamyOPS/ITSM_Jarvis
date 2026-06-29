export enum CiStatus {
  IN_SERVICE = 'IN_SERVICE',
  IN_STOCK = 'IN_STOCK',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export const DEFAULT_CI_STATUSES = [
  CiStatus.IN_SERVICE,
  CiStatus.IN_STOCK,
  CiStatus.MAINTENANCE,
  CiStatus.OUT_OF_SERVICE,
] as const;
