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
import {
  canAccessRoute,
  getHomeRoute,
} from '../../application/auth/access-control';
import { resolveRoute } from '../../application/routing/route-resolver';
import { type RoutePath } from '../../domain/navigation/route';
import {
  navigateTo,
  useBrowserPath,
} from '../../infrastructure/routing/browser-router';
import { AccessDeniedPage } from '../pages/access-denied-page';
import { AdminPage } from '../pages/admin-page';
import { AgentPage } from '../pages/agent-page';
import { AppShell } from './app-shell';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { NotFoundPage } from '../pages/not-found-page';
import { ReportsPage } from '../pages/reports-page';
import { UsersPage } from '../pages/users-page';

type SessionState = 'anonymous' | 'authenticated' | 'loading' | 'restoring';

type RenderPageParams = {
  authErrorMessage: string | null;
  isLoggingIn: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  pathname: string;
  session: AuthSessionSnapshot | null;
  sessionState: SessionState;
};

function renderPage({
  authErrorMessage,
  isLoggingIn,
  onLogin,
  pathname,
  session,
  sessionState,
}: RenderPageParams) {
  if (
    (sessionState === 'loading' || sessionState === 'restoring') &&
    pathname !== '/login'
  ) {
    return <div className="app-loading-screen" />;
  }

  const route = resolveRoute(pathname);

  if (!route) {
    return <NotFoundPage />;
  }

  const routePath = route.path as RoutePath;

  if (!canAccessRoute(routePath, session)) {
    if (!session) {
      return (
        <LoginPage
          errorMessage={authErrorMessage}
          isBusy={isLoggingIn || sessionState === 'loading'}
          onSubmit={onLogin}
        />
      );
    }

    return <AccessDeniedPage role={session.user.role} />;
  }

  switch (route.path) {
    case '/':
      if (session && getHomeRoute(session) === '/reports') {
        return <ReportsPage session={session} />;
      }

      return <HomePage />;
    case '/admin':
      return session ? <AdminPage session={session} /> : <NotFoundPage />;
    case '/admin/users':
      return session ? <UsersPage session={session} /> : <NotFoundPage />;
    case '/agent':
      return session ? (
        <AgentPage section="LIST" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/incidents/new':
      return session ? (
        <AgentPage section="INCIDENT_CREATE" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/requests/new':
      return session ? (
        <AgentPage section="REQUEST_CREATE" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/my-tickets':
      return session ? (
        <AgentPage section="MY_TICKETS" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/unassigned-tickets':
      return session ? (
        <AgentPage section="UNASSIGNED_TICKETS" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/assigned-to-me':
      return session ? (
        <AgentPage section="ASSIGNED_TO_ME" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/archives':
      if (pathname.startsWith('/agent/archives/')) {
        const ticketId = pathname.replace('/agent/archives/', '').trim();

        return session && ticketId ? (
          <AgentPage
            section="ARCHIVE_DETAIL"
            session={session}
            ticketId={ticketId}
          />
        ) : (
          <NotFoundPage />
        );
      }

      return session ? (
        <AgentPage section="ARCHIVES" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/agent/tickets':
      if (pathname.startsWith('/agent/tickets/')) {
        const ticketId = pathname.replace('/agent/tickets/', '').trim();

        return session && ticketId ? (
          <AgentPage section="DETAIL" session={session} ticketId={ticketId} />
        ) : (
          <NotFoundPage />
        );
      }

      return session ? (
        <AgentPage section="LIST" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/reports':
      return session ? <ReportsPage session={session} /> : <NotFoundPage />;
    case '/login':
      return (
        <LoginPage
          errorMessage={authErrorMessage}
          isBusy={isLoggingIn || sessionState === 'loading'}
          onSubmit={onLogin}
        />
      );
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

  useEffect(() => {
    if (pathname === '/login' && sessionState === 'authenticated' && session) {
      navigateTo(getHomeRoute(session));
    }
  }, [pathname, session, sessionState]);

  useEffect(() => {
    if (
      pathname === '/' &&
      sessionState === 'authenticated' &&
      session &&
      getHomeRoute(session) !== '/'
    ) {
      navigateTo(getHomeRoute(session));
    }
  }, [pathname, session, sessionState]);

  useEffect(() => {
    if (sessionState === 'anonymous' && !isLoggingIn && pathname !== '/login') {
      navigateTo('/login');
    }
  }, [isLoggingIn, pathname, sessionState]);

  async function handleLogin(email: string, password: string): Promise<void> {
    setIsLoggingIn(true);
    setAuthErrorMessage(null);

    try {
      const nextSession = await loginWithPassword(email, password);

      storeAuthSession(nextSession);
      setSession(nextSession);
      setSessionState('authenticated');
      navigateTo(getHomeRoute(nextSession));
    } catch (error) {
      setSession(null);
      setSessionState('anonymous');
      setAuthErrorMessage(
        error instanceof Error ? error.message : 'Erreur de connexion inconnue',
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
    navigateTo('/login');
  }

  return (
    <AppShell
      isAuthenticated={sessionState === 'authenticated'}
      onLogout={handleLogout}
      pathname={pathname}
      session={session}
    >
      {renderPage({
        authErrorMessage,
        isLoggingIn,
        onLogin: handleLogin,
        pathname,
        session,
        sessionState,
      })}
    </AppShell>
  );
}
