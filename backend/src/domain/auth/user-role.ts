export enum UserRole {
  USER = 'USER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export const DEFAULT_USER_ROLES = [
  UserRole.USER,
  UserRole.AGENT,
  UserRole.ADMIN,
] as const;
