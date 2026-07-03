import type { UserRole } from './user-role';

export type AdminUserSummary = {
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
