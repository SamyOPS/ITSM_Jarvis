import { UserRole } from './user-role';

export interface AuthenticatedUser {
  accessToken: string;
  email: string;
  id: string;
  role: UserRole;
}
