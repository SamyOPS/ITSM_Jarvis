import type { UserRole } from './user-role';

export interface AuthenticatedUser {
  accessToken: string;
  canManageAssets?: boolean;
  canManageKnowledgeBase?: boolean;
  canValidateKnowledgeBase?: boolean;
  email: string;
  firstName: string | null;
  groupId?: string | null;
  groupIds?: string[];
  id: string;
  isVip?: boolean;
  lastName: string | null;
  role: UserRole;
}
