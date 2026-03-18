import { UserRole } from './user-role';

export interface AuthenticatedUser {
  email: string;
  id: string;
  role: UserRole;
}
