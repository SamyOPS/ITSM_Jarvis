import { UserRole } from './user-role';

export interface AuthenticatedUser {
  accessToken: string;
  email: string;
  canManageAssets?: boolean;
  canManageKnowledgeBase?: boolean;
  canValidateKnowledgeBase?: boolean;
  firstName: string | null;
  id: string;
  isVip?: boolean;
  lastName: string | null;
  profilePhotoUrl?: string | null;
  role: UserRole;
}
