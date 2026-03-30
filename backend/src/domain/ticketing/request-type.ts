export enum RequestType {
  ACCESS = 'ACCESS',
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  OTHER = 'OTHER',
}

export const DEFAULT_REQUEST_TYPES = [
  RequestType.ACCESS,
  RequestType.HARDWARE,
  RequestType.SOFTWARE,
  RequestType.OTHER,
] as const;
