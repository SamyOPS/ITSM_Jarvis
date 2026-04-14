import type { UserRole } from './user-role';

export type AdminUserSummary = {
  displayName: string | null;
  firstName: string | null;
  groupId: string | null;
  id: string;
  isActive: boolean;
  lastName: string | null;
  role: UserRole;
};
