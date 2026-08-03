import { type AuthenticatedUser } from './authenticated-user';
import { isAdminRole } from './user-role';

export function canManageUserCapabilities(user: AuthenticatedUser): boolean {
  return isAdminRole(user.role);
}

export function canManageAssets(user: AuthenticatedUser): boolean {
  return isAdminRole(user.role) || Boolean(user.canManageAssets);
}

export function canManageKnowledgeBase(user: AuthenticatedUser): boolean {
  return isAdminRole(user.role) || Boolean(user.canManageKnowledgeBase);
}

export function canValidateKnowledgeBase(user: AuthenticatedUser): boolean {
  return canManageKnowledgeBase(user) || Boolean(user.canValidateKnowledgeBase);
}
