import type { UserRole } from './user-role';

export type AdminUserSummary = {
  displayName: string | null;
  groupId: string | null;
  id: string;
  isActive: boolean;
  role: UserRole;
};
