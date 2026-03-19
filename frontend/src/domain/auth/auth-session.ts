import type { AuthenticatedUser } from './authenticated-user';

export interface AuthSessionSnapshot {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
