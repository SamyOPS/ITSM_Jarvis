import { type UserRole } from './user-role';

export type AdminUserSummary = {
  displayName: string | null;
  email: string | null;
  firstName: string | null;
  groupId: string | null;
  groupIds: string[];
  id: string;
  isActive: boolean;
  lastName: string | null;
  role: UserRole;
};
