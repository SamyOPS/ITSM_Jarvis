import { useEffect, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  fetchCurrentUser,
  loginWithPassword,
} from '../../infrastructure/api/auth-api';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  storeAuthSession,
} from '../../infrastructure/auth/session-storage';
import { resolveRoute } from '../../application/routing/route-resolver';
import { useBrowserPath } from '../../infrastructure/routing/browser-router';
import { AppShell } from './app-shell';
import { AuthPage } from '../pages/auth-page';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { NotFoundPage } from '../pages/not-found-page';
import { StatusPage } from '../pages/status-page';

type SessionState = 'anonymous' | 'authenticated' | 'loading' | 'restoring';

type RenderPageParams = {
  authErrorMessage: string | null;
  isLoggingIn: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
  pathname: string;
  session: AuthSessionSnapshot | null;
  sessionState: SessionState;
};

function renderPage({
  authErrorMessage,
  isLoggingIn,
  onLogin,
  onLogout,
  pathname,
  session,
  sessionState,
}: RenderPageParams) {
  const route = resolveRoute(pathname);

  if (!route) {
    return <NotFoundPage />;
  }

  switch (route.path) {
    case '/':
      return <HomePage />;
    case '/auth':
      return (
        <AuthPage
          onLogout={onLogout}
          session={session}
          sessionState={sessionState === 'loading' ? 'restoring' : sessionState}
        />
      );
    case '/login':
      return (
        <LoginPage
          errorMessage={authErrorMessage}
          isBusy={isLoggingIn || sessionState === 'loading'}
          onSubmit={onLogin}
        />
      );
    case '/status':
      return <StatusPage />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  const pathname = useBrowserPath();
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [session, setSession] = useState<AuthSessionSnapshot | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function restoreSession(): Promise<void> {
      const storedSession = readStoredAuthSession();

      if (!storedSession) {
        if (!cancelled) {
          setSession(null);
          setSessionState('anonymous');
        }

        return;
      }

      if (!cancelled) {
        setSessionState('restoring');
      }

      try {
        const user = await fetchCurrentUser(storedSession.accessToken);

        if (cancelled) {
          return;
        }

        const restoredSession = {
          ...storedSession,
          user,
        };

        storeAuthSession(restoredSession);
        setSession(restoredSession);
        setSessionState('authenticated');
      } catch {
        clearStoredAuthSession();

        if (cancelled) {
          return;
        }

        setSession(null);
        setSessionState('anonymous');
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(email: string, password: string): Promise<void> {
    setIsLoggingIn(true);
    setAuthErrorMessage(null);

    try {
      const nextSession = await loginWithPassword(email, password);

      storeAuthSession(nextSession);
      setSession(nextSession);
      setSessionState('authenticated');
    } catch (error) {
      setSession(null);
      setSessionState('anonymous');
      setAuthErrorMessage(
        error instanceof Error ? error.message : 'Unknown login error',
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout(): void {
    clearStoredAuthSession();
    setAuthErrorMessage(null);
    setSession(null);
    setSessionState('anonymous');
  }

  return (
    <AppShell
      isAuthenticated={sessionState === 'authenticated'}
      onLogout={handleLogout}
    >
      {renderPage({
        authErrorMessage,
        isLoggingIn,
        onLogin: handleLogin,
        onLogout: handleLogout,
        pathname,
        session,
        sessionState,
      })}
    </AppShell>
  );
}
