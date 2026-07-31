import type { UserRole } from './user-role';
import type { UserAccountStatus } from './user-account-status';

export type AdminUserSummary = {
  accountStatus?: UserAccountStatus;
  createdAt?: string | null;
  displayName: string | null;
  email: string | null;
  firstName: string | null;
  groupId: string | null;
  groupIds?: string[];
  id: string;
  isActive: boolean;
  lastName: string | null;
  role: UserRole;
  updatedAt?: string | null;
};
