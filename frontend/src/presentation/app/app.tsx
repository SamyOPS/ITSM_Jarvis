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
import { RegisterPage } from '../pages/register-page';
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
      if (session) {
        return <ReportsPage session={session} />;
      }

      return <HomePage />;
    case '/parc/cis/new':
      return session ? (
        <ParkPage mode="CREATE" session={session} />
      ) : (
        <NotFoundPage />
      );
    case '/parc/cis':
      if (pathname.startsWith('/parc/cis/')) {
        const ciId = pathname.replace('/parc/cis/', '').trim();

        return session && ciId ? (
          <ParkPage ciId={ciId} mode="DETAIL" session={session} />
        ) : (
          <NotFoundPage />
        );
      }

      return session ? (
        <ParkPage mode="LIST" session={session} />
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
    case '/register':
      return <RegisterPage />;
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
      const signupConfirmation = readSignupConfirmationCallback();

      if (signupConfirmation) {
        clearStoredAuthSession();

        if (!cancelled) {
          setSession(null);
          setSessionState('anonymous');
          redirectToLoginAfterSignupConfirmation(signupConfirmation.email);
        }

        return;
      }

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
      pathname !== '/register' &&
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
            'Votre session a expire ou votre compte est desactive. Reconnectez-vous pour continuer.',
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
      setAuthErrorMessage(mapLoginErrorMessage(error));
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

function mapLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Erreur de connexion inconnue.';
  }

  const normalizedMessage = error.message.toLowerCase();

  if (
    normalizedMessage.includes('email not confirmed') ||
    normalizedMessage.includes('email_not_confirmed') ||
    normalizedMessage.includes('not confirmed')
  ) {
    return 'Votre email n est pas encore confirme. Verifiez votre boite mail avant de vous connecter.';
  }

  if (
    normalizedMessage.includes('invalid login credentials') ||
    normalizedMessage.includes('invalid_credentials') ||
    normalizedMessage.includes('invalid credentials')
  ) {
    return 'Email ou mot de passe incorrect.';
  }

  return error.message || 'Connexion impossible pour le moment.';
}

function readSignupConfirmationCallback(): { email: string | null } | null {
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, ''),
  );
  const queryParams = new URLSearchParams(window.location.search);
  const type = hashParams.get('type') ?? queryParams.get('type');

  if (type !== 'signup') {
    return null;
  }

  const accessToken =
    hashParams.get('access_token') ?? queryParams.get('access_token');

  return {
    email: accessToken ? readEmailFromJwt(accessToken) : null,
  };
}

function redirectToLoginAfterSignupConfirmation(email: string | null): void {
  const loginPath = email
    ? `/login?emailConfirmed=success&email=${encodeURIComponent(email)}`
    : '/login?emailConfirmed=success';

  window.history.replaceState({}, '', loginPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function readEmailFromJwt(token: string): string | null {
  const parts = token.split('.');

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as {
      email?: unknown;
    };

    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + paddingLength,
    '=',
  );

  return window.atob(paddedValue);
}
