import { UserRole } from './user-role';

export interface UserAssignmentProfile {
  groupId: string | null;
  groupIds: string[];
  id: string;
  isActive: boolean;
  role: UserRole;
}
