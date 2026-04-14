import type { UserRole } from './user-role';

export interface AuthenticatedUser {
  accessToken: string;
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
  role: UserRole;
}
