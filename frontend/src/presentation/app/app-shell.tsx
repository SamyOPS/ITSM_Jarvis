import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import { getVisibleRoutes } from '../../application/auth/access-control';
import { ROUTES } from '../../domain/navigation/route';
import { navigateTo } from '../../infrastructure/routing/browser-router';

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  onLogout: () => void;
  pathname: string;
  session: AuthSessionSnapshot | null;
}

export function AppShell({
  children,
  isAuthenticated,
  onLogout,
  pathname,
  session,
}: AppShellProps) {
  const visibleRoutePaths = getVisibleRoutes(session);
  const visibleRoutes = ROUTES.filter((route) =>
    visibleRoutePaths.includes(route.path),
  );
  const activeRoute = ROUTES.find((route) => route.path === pathname) ?? null;
  const isWorkspaceShell = isAuthenticated;

  if (!isWorkspaceShell) {
    return (
      <div className="app-shell app-shell--legacy">
        <header className="app-header">
          <div>
            <p className="eyebrow">Jarvis Connect</p>
            <h1>Portail de ticketing ITSM</h1>
            <p className="lead">
              Centre de support PME pour incidents, demandes et supervision des
              accès. Interface de travail unifiée pour demandeurs, agents et
              administrateurs.
            </p>
          </div>

          <nav aria-label="Navigation principale" className="app-nav">
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
            <button
              className="secondary-button"
              onClick={onLogout}
              type="button"
            >
              {isAuthenticated ? 'Fermer la session' : 'Effacer la session'}
            </button>
          </nav>
        </header>

        <main className="app-main">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell--workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-brand">
          <div>
            <p className="workspace-sidebar-eyebrow">Jarvis Connect</p>
            <strong>Vision</strong>
          </div>
          <span>Plateforme interne</span>
        </div>

        <label className="workspace-sidebar-search">
          <span>Recherche rapide</span>
          <input placeholder="Chercher dans le menu..." type="search" />
        </label>

        <nav
          aria-label="Navigation principale"
          className="workspace-sidebar-nav"
        >
          {visibleRoutes.map((route) => (
            <button
              className={
                route.path === pathname
                  ? 'workspace-nav-link is-active'
                  : 'workspace-nav-link'
              }
              key={route.path}
              onClick={() => navigateTo(route.path)}
              type="button"
            >
              <strong>{route.title}</strong>
            </button>
          ))}
        </nav>

        <div className="workspace-sidebar-footer">
          <strong>{session?.user.email ?? 'Session locale'}</strong>
          <span>{session?.user.role ?? 'Aucun role'}</span>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-copy">
            <span>{activeRoute?.title ?? 'Workspace'}</span>
            <h1>{activeRoute?.description ?? 'Portail de travail Jarvis.'}</h1>
          </div>

          <div className="workspace-topbar-actions">
            <label className="workspace-topbar-search">
              <input
                placeholder="Rechercher (tickets, assets, utilisateurs)..."
                type="search"
              />
              <span>Ctrl K</span>
            </label>

            <button
              className="primary-button workspace-cta-button"
              onClick={() => navigateTo('/agent/incidents/new')}
              type="button"
            >
              Nouveau ticket
            </button>

            <button
              className="secondary-button workspace-logout-button"
              onClick={onLogout}
              type="button"
            >
              Fermer la session
            </button>
          </div>
        </header>

        <main className="app-main app-main--workspace">{children}</main>
      </div>
    </div>
  );
}
