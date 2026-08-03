import type { UserRole } from './user-role';

export interface AuthenticatedUser {
  accessToken: string;
  canManageAssets?: boolean;
  canManageKnowledgeBase?: boolean;
  canValidateKnowledgeBase?: boolean;
  email: string;
  firstName: string | null;
  id: string;
  isVip?: boolean;
  lastName: string | null;
  role: UserRole;
}
