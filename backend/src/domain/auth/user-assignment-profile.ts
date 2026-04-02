import { UserRole } from './user-role';

export interface UserAssignmentProfile {
  groupId: string | null;
  id: string;
  isActive: boolean;
  role: UserRole;
}
