export enum UserRole {
  DEMANDEUR = 'DEMANDEUR',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const DEFAULT_USER_ROLES = [
  UserRole.DEMANDEUR,
  UserRole.AGENT,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function isSupportRole(role: UserRole): boolean {
  return role === UserRole.AGENT || isAdminRole(role);
}
