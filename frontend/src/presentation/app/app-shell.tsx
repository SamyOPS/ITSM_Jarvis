import { useEffect, useRef, useState } from 'react';
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
  const [isTicketMenuOpen, setIsTicketMenuOpen] = useState(false);
  const ticketMenuRef = useRef<HTMLDivElement | null>(null);
  const visibleRoutePaths = getVisibleRoutes(session);
  const visibleRoutes = ROUTES.filter((route) =>
    visibleRoutePaths.includes(route.path),
  );
  const activeRoute = ROUTES.find((route) => route.path === pathname) ?? null;
  const isWorkspaceShell = isAuthenticated;
  const isLoginShell = pathname === '/login';

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (
        ticketMenuRef.current &&
        !ticketMenuRef.current.contains(event.target as Node)
      ) {
        setIsTicketMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  function handleCreateIncidentClick(): void {
    setIsTicketMenuOpen(false);
    navigateTo('/agent/incidents/new');
  }

  function handleCreateRequestClick(): void {
    setIsTicketMenuOpen(false);
    navigateTo('/agent/requests/new');
  }

  if (isLoginShell) {
    return <div className="app-shell app-shell--login">{children}</div>;
  }

  if (!isWorkspaceShell) {
    return <div className="app-shell app-shell--login">{children}</div>;
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

            <div className="workspace-ticket-menu" ref={ticketMenuRef}>
              <button
                className="primary-button workspace-cta-button"
                onClick={() => setIsTicketMenuOpen((current) => !current)}
                type="button"
              >
                Nouveau ticket
              </button>

              {isTicketMenuOpen ? (
                <div className="workspace-ticket-menu-popover">
                  <button
                    className="workspace-ticket-menu-item"
                    onClick={handleCreateIncidentClick}
                    type="button"
                  >
                    Créer un ticket d'incident
                  </button>

                  <button
                    className="workspace-ticket-menu-item"
                    onClick={handleCreateRequestClick}
                    type="button"
                  >
                    Créer un ticket de demande
                  </button>
                </div>
              ) : null}
            </div>

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
