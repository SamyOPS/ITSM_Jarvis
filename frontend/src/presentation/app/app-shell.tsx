import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  Ticket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import { getVisibleRoutes } from '../../application/auth/access-control';
import type { RoutePath } from '../../domain/navigation/route';
import { ROUTES } from '../../domain/navigation/route';
import { navigateTo } from '../../infrastructure/routing/browser-router';

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  onLogout: () => void;
  pathname: string;
  session: AuthSessionSnapshot | null;
}

const routeIcons: Partial<Record<RoutePath, LucideIcon>> = {
  '/': LayoutDashboard,
  '/admin': Shield,
  '/agent': LayoutDashboard,
  '/agent/incidents/new': AlertTriangle,
  '/agent/requests/new': FileText,
  '/agent/tickets': Ticket,
};

function isRouteActive(routePath: RoutePath, pathname: string): boolean {
  if (routePath === '/agent/tickets') {
    return (
      pathname === '/agent/tickets' || pathname.startsWith('/agent/tickets/')
    );
  }

  if (routePath === '/agent') {
    return pathname === '/agent';
  }

  return pathname === routePath;
}

export function AppShell({
  children,
  isAuthenticated,
  onLogout,
  pathname,
  session,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTicketMenuOpen, setIsTicketMenuOpen] = useState(false);
  const ticketMenuRef = useRef<HTMLDivElement | null>(null);
  const visibleRoutePaths = getVisibleRoutes(session);
  const visibleRoutes = ROUTES.filter((route) =>
    visibleRoutePaths.includes(route.path),
  );
  const isWorkspaceShell = isAuthenticated;
  const isLoginShell = pathname === '/login';
  const isHomeRoute = pathname === '/';

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
    return (
      <div className="app-shell app-shell--legacy">
        <header className="app-header">
          <div>
            <p className="eyebrow">Jarvis Connect</p>
            <h1>Portail de ticketing ITSM</h1>
            <p className="lead">
              Centre de support PME pour incidents, demandes et supervision des
              acces. Interface de travail unifiee pour demandeurs, agents et
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
      <aside
        className={
          isSidebarCollapsed
            ? 'workspace-sidebar is-collapsed'
            : 'workspace-sidebar'
        }
      >
        <div className="workspace-sidebar-header">
          <div className="workspace-sidebar-brand">
            <div className="workspace-sidebar-brand-copy">
              <strong>Vision</strong>
              <span>By JarvisConnecte</span>
            </div>
          </div>

          <button
            aria-label={
              isSidebarCollapsed
                ? 'Ouvrir la navigation'
                : 'Replier la navigation'
            }
            className="workspace-sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            type="button"
          >
            <Menu size={18} />
          </button>
        </div>

        <label className="workspace-sidebar-search">
          <span className="workspace-sidebar-search-shell">
            <Search size={16} />
            <input placeholder="Chercher dans le menu..." type="search" />
          </span>
        </label>

        <div className="workspace-sidebar-section-label">Navigation</div>

        <nav
          aria-label="Navigation principale"
          className="workspace-sidebar-nav"
        >
          {visibleRoutes.map((route) => {
            const Icon = routeIcons[route.path] ?? Ticket;
            const isActive = isRouteActive(route.path, pathname);

            return (
              <button
                className={
                  isActive
                    ? 'workspace-nav-link is-active'
                    : 'workspace-nav-link'
                }
                key={route.path}
                onClick={() => navigateTo(route.path)}
                title={route.title}
                type="button"
              >
                <span className="workspace-nav-link-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <strong className="workspace-nav-link-label">
                  {route.title}
                </strong>
              </button>
            );
          })}
        </nav>

        <div className="workspace-sidebar-footer">
          <strong>{session?.user.email ?? 'Session locale'}</strong>
          <span>{session?.user.role ?? 'Aucun role'}</span>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-copy">
            <button
              className={
                isHomeRoute
                  ? 'workspace-home-link is-active'
                  : 'workspace-home-link'
              }
              onClick={() => navigateTo('/')}
              type="button"
            >
              <House
                className="workspace-home-link-icon"
                size={15}
                strokeWidth={2.1}
              />
              <span>Accueil</span>
            </button>
          </div>

          <div className="workspace-topbar-search-shell">
            <label className="workspace-topbar-search">
              <Search
                className="workspace-topbar-search-icon"
                size={17}
                strokeWidth={2}
              />
              <input
                placeholder="Rechercher (tickets, assets, utilisateurs)..."
                type="search"
              />
              <span>Ctrl K</span>
            </label>
          </div>

          <div className="workspace-topbar-actions">
            <div className="workspace-ticket-menu" ref={ticketMenuRef}>
              <button
                className="primary-button workspace-cta-button"
                onClick={() => setIsTicketMenuOpen((current) => !current)}
                type="button"
              >
                <Plus size={16} strokeWidth={2.2} />
                <span>Nouveau ticket</span>
              </button>

              {isTicketMenuOpen ? (
                <div className="workspace-ticket-menu-popover">
                  <button
                    className="workspace-ticket-menu-item"
                    onClick={handleCreateIncidentClick}
                    type="button"
                  >
                    Creer un ticket d'incident
                  </button>

                  <button
                    className="workspace-ticket-menu-item"
                    onClick={handleCreateRequestClick}
                    type="button"
                  >
                    Creer un ticket de demande
                  </button>
                </div>
              ) : null}
            </div>

            <button
              className="secondary-button workspace-logout-button"
              onClick={onLogout}
              type="button"
            >
              <LogOut size={16} strokeWidth={2} />
              <span>Fermer la session</span>
            </button>
          </div>
        </header>

        <main className="app-main app-main--workspace">{children}</main>
      </div>
    </div>
  );
}
