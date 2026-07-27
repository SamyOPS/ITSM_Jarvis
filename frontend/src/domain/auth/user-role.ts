export type UserRole =
  | 'DEMANDEUR'
  | 'AGENT'
  | 'MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export const DEFAULT_USER_ROLES: UserRole[] = [
  'DEMANDEUR',
  'AGENT',
  'MANAGER',
  'ADMIN',
  'SUPER_ADMIN',
];

export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function isSupportManagerRole(role: UserRole): boolean {
  return role === 'MANAGER' || isAdminRole(role);
}

export function isSupportRole(role: UserRole): boolean {
  return role === 'AGENT' || role === 'MANAGER' || isAdminRole(role);
}
