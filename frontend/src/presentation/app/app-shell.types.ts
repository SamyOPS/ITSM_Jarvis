import type { ReactNode } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

export interface AppShellProps {
  children: ReactNode;
  isAuthenticated: boolean;
  onLogout: () => void;
  pathname: string;
  session: AuthSessionSnapshot | null;
}
