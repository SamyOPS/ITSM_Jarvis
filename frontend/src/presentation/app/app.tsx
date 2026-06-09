import { useEffect, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  fetchCurrentUser,
  loginWithPassword,
  requestPasswordReset,
  refreshAuthSession,
} from '../../infrastructure/api/auth-api';
import { getFrontendRuntimeConfig } from '../../infrastructure/config/env';
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
import { AgentPage } from '../pages/agent-page';
import { AppShell } from './app-shell';
import { GroupsPage } from '../pages/groups-page';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { NotFoundPage } from '../pages/not-found-page';
import { KnowledgePage } from '../pages/knowledge-page';
import { ParkPage } from '../pages/park-page';
import { ReportsPage } from '../pages/reports-page';
import { ResetPasswordPage } from '../pages/reset-password-page';
import { UsersPage } from '../pages/users-page';

type SessionState = 'anonymous' | 'authenticated' | 'loading' | 'restoring';

type RenderPageParams = {
  authErrorMessage: string | null;
  isLoggingIn: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onPasswordResetRequest: (email: string) => Promise<void>;
  onPasswordUpdated: () => void;
  pathname: string;
  session: AuthSessionSnapshot | null;
  sessionState: SessionState;
};

function renderPage({
  authErrorMessage,
  isLoggingIn,
  onLogin,
  onPasswordResetRequest,
  onPasswordUpdated,
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
          onPasswordResetRequest={onPasswordResetRequest}
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
    case '/parc/ci-types':
      return session ? (
        <ParkPage section="CI_TYPES" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/parc/cis':
      return session ? (
        <ParkPage section="CIS" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/knowledge/articles':
      if (pathname.startsWith('/knowledge/articles/')) {
        const articleId = pathname.replace('/knowledge/articles/', '').trim();

        return session && articleId ? (
          <KnowledgePage articleId={articleId} session={session} />
        ) : (
          <NotFoundPage />
        );
      }

      return session ? <KnowledgePage session={session} /> : <NotFoundPage />;
    case '/admin/groups':
      return session ? <GroupsPage session={session} /> : <NotFoundPage />;
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
          onPasswordResetRequest={onPasswordResetRequest}
          onSubmit={onLogin}
        />
      );
    case '/auth/reset-password':
      return <ResetPasswordPage onPasswordUpdated={onPasswordUpdated} />;
    default:
      return <NotFoundPage />;
  }
}

async function restoreOrRefreshSession(
  storedSession: AuthSessionSnapshot,
): Promise<AuthSessionSnapshot> {
  try {
    const user = await fetchCurrentUser(storedSession.accessToken);

    return {
      ...storedSession,
      user,
    };
  } catch {
    return refreshAuthSession(storedSession.refreshToken);
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
        const restoredSession = await restoreOrRefreshSession(storedSession);

        if (cancelled) {
          return;
        }

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
    if (
      sessionState === 'anonymous' &&
      !isLoggingIn &&
      pathname !== '/login' &&
      pathname !== '/auth/reset-password'
    ) {
      navigateTo('/login');
    }
  }, [isLoggingIn, pathname, sessionState]);

  useEffect(() => {
    if (sessionState !== 'authenticated') {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const { apiUrl } = getFrontendRuntimeConfig();
    let refreshPromise: Promise<AuthSessionSnapshot> | null = null;

    async function refreshSession(): Promise<AuthSessionSnapshot> {
      if (!session?.refreshToken) {
        throw new Error('Missing refresh token.');
      }

      if (!refreshPromise) {
        refreshPromise = refreshAuthSession(session.refreshToken).then(
          (nextSession) => {
            storeAuthSession(nextSession);
            setSession(nextSession);
            setSessionState('authenticated');

            return nextSession;
          },
        );
      }

      try {
        return await refreshPromise;
      } finally {
        refreshPromise = null;
      }
    }

    window.fetch = async (input, init) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      const isBackendRequest = requestUrl.startsWith(apiUrl);
      const response = await originalFetch(input, init);

      if (response.status === 401 && isBackendRequest) {
        try {
          const nextSession = await refreshSession();
          const headers = new Headers(
            input instanceof Request ? input.headers : init?.headers,
          );

          headers.set('Authorization', `Bearer ${nextSession.accessToken}`);

          const retryResponse = await originalFetch(input, {
            ...init,
            headers,
          });

          if (retryResponse.status !== 401) {
            return retryResponse;
          }

          throw new Error('Session refresh retry failed.');
        } catch {
          clearStoredAuthSession();
          setAuthErrorMessage(
            'Votre session a expiré ou votre compte est désactivé.',
          );
          setSession(null);
          setSessionState('anonymous');
          navigateTo('/login');
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [session, sessionState]);

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

  async function handlePasswordResetRequest(email: string): Promise<void> {
    await requestPasswordReset(email);
  }

  function handlePasswordUpdated(): void {
    clearStoredAuthSession();
    setAuthErrorMessage(null);
    setSession(null);
    setSessionState('anonymous');
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
        onPasswordResetRequest: handlePasswordResetRequest,
        onPasswordUpdated: handlePasswordUpdated,
        pathname,
        session,
        sessionState,
      })}
    </AppShell>
  );
}
