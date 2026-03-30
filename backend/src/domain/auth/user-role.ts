export enum UserRole {
  DEMANDEUR = 'DEMANDEUR',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export const DEFAULT_USER_ROLES = [
  UserRole.DEMANDEUR,
  UserRole.AGENT,
  UserRole.ADMIN,
] as const;
