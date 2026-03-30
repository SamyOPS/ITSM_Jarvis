import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import { getVisibleRoutes } from '../../application/auth/access-control';
import { ROUTES } from '../../domain/navigation/route';
import { navigateTo } from '../../infrastructure/routing/browser-router';

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  onLogout: () => void;
  session: AuthSessionSnapshot | null;
}

export function AppShell({
  children,
  isAuthenticated,
  onLogout,
  session,
}: AppShellProps) {
  const visibleRoutePaths = getVisibleRoutes(session);
  const visibleRoutes = ROUTES.filter((route) =>
    visibleRoutePaths.includes(route.path),
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">TikIA</p>
          <h1>Frontend Technical Base</h1>
          <p className="lead">
            Modular React structure with minimal routing, ready for the next
            product slices.
          </p>
        </div>

        <nav aria-label="Primary" className="app-nav">
          {visibleRoutes.map((route) => (
            <button
              className="nav-link"
              key={route.path}
              onClick={() => navigateTo(route.path)}
              type="button"
            >
              {route.title}
            </button>
          ))}
          <button className="secondary-button" onClick={onLogout} type="button">
            {isAuthenticated ? 'Logout' : 'Clear session'}
          </button>
        </nav>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
