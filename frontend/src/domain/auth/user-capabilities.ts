import type { AuthenticatedUser } from './authenticated-user';
import type { AdminUserSummary } from './admin-user-summary';
import { isAdminRole } from './user-role';

type UserWithCapabilities = AuthenticatedUser | AdminUserSummary;

export function canManageUserCapabilities(user: UserWithCapabilities): boolean {
  return isAdminRole(user.role);
}

export function canManageAssets(user: UserWithCapabilities): boolean {
  if (user.role === 'DEMANDEUR') {
    return false;
  }

  return isAdminRole(user.role) || Boolean(user.canManageAssets);
}

export function canManageKnowledgeBase(user: UserWithCapabilities): boolean {
  if (user.role === 'DEMANDEUR') {
    return false;
  }

  return isAdminRole(user.role) || Boolean(user.canManageKnowledgeBase);
}

export function canValidateKnowledgeBase(user: UserWithCapabilities): boolean {
  if (user.role === 'DEMANDEUR') {
    return false;
  }

  return canManageKnowledgeBase(user) || Boolean(user.canValidateKnowledgeBase);
}
