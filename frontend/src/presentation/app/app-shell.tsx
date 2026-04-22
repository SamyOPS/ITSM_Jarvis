import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  ChevronDown,
  FileText,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  getHomeRoute,
  getVisibleRoutes,
} from '../../application/auth/access-control';
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
  '/admin/users': Users,
  '/agent': LayoutDashboard,
  '/agent/archives': Archive,
  '/agent/incidents/new': AlertTriangle,
  '/agent/requests/new': FileText,
  '/agent/tickets': Ticket,
  '/reports': BarChart3,
};

function isRouteActive(routePath: RoutePath, pathname: string): boolean {
  if (routePath === '/agent/tickets') {
    return (
      pathname === '/agent/tickets' ||
      pathname === '/agent/assigned-to-me' ||
      pathname === '/agent/my-tickets' ||
      pathname === '/agent/unassigned-tickets' ||
      pathname.startsWith('/agent/tickets/')
    );
  }

  if (routePath === '/agent/archives') {
    return (
      pathname === '/agent/archives' || pathname.startsWith('/agent/archives/')
    );
  }

  if (routePath === '/agent') {
    return pathname === '/agent';
  }

  return pathname === routePath;
}

function getUserInitials(session: AuthSessionSnapshot | null): string {
  if (!session) {
    return 'VI';
  }

  const initials = [session.user.firstName, session.user.lastName]
    .filter(Boolean)
    .map((value) => value!.trim().charAt(0).toUpperCase())
    .join('');

  if (initials) {
    return initials.slice(0, 2);
  }

  return session.user.email.slice(0, 2).toUpperCase();
}

function getUserDisplayName(session: AuthSessionSnapshot | null): string {
  if (!session) {
    return 'Session locale';
  }

  const fullName = [session.user.firstName, session.user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || session.user.email;
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
  const [isTicketListMenuOpen, setIsTicketListMenuOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const ticketMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const visibleRoutePaths = getVisibleRoutes(session);
  const visibleRoutes = visibleRoutePaths
    .map((path) => ROUTES.find((route) => route.path === path) ?? null)
    .filter((route) => route !== null);
  const isWorkspaceShell = isAuthenticated;
  const isLoginShell = pathname === '/login';
  const homeRoute = getHomeRoute(session);
  const isHomeRoute = pathname === homeRoute;
  const userInitials = useMemo(() => getUserInitials(session), [session]);
  const userDisplayName = useMemo(() => getUserDisplayName(session), [session]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as Node;

      if (ticketMenuRef.current && !ticketMenuRef.current.contains(target)) {
        setIsTicketMenuOpen(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
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

  function handleLogoutClick(): void {
    setIsProfileMenuOpen(false);
    onLogout();
  }

  if (isLoginShell) {
    return <div className="app-shell app-shell--login">{children}</div>;
  }

  if (!isWorkspaceShell) {
    return <div className="app-shell app-shell--login">{children}</div>;
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
              <span>By JarvisConnect</span>
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

        <div className="workspace-sidebar-divider" />

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
            const shouldShowTicketDropdown =
              route.path === '/agent/tickets' &&
              session?.user.role !== 'DEMANDEUR';

            if (shouldShowTicketDropdown) {
              return (
                <div
                  className={
                    isTicketListMenuOpen
                      ? 'workspace-nav-dropdown is-open'
                      : 'workspace-nav-dropdown'
                  }
                  key={route.path}
                >
                  <button
                    aria-expanded={isTicketListMenuOpen}
                    className={
                      isActive
                        ? 'workspace-nav-link is-active'
                        : 'workspace-nav-link'
                    }
                    onClick={() =>
                      setIsTicketListMenuOpen((current) => !current)
                    }
                    title={route.title}
                    type="button"
                  >
                    <span
                      className="workspace-nav-link-icon"
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <strong className="workspace-nav-link-label">
                      {route.title}
                    </strong>
                    <ChevronDown
                      className="workspace-nav-dropdown-chevron"
                      size={16}
                      strokeWidth={2}
                    />
                  </button>

                  {isTicketListMenuOpen ? (
                    <div className="workspace-nav-dropdown-list">
                      <button
                        className="workspace-nav-dropdown-item"
                        onClick={() => navigateTo('/agent/tickets')}
                        type="button"
                      >
                        Tous les tickets
                      </button>
                      <button
                        className="workspace-nav-dropdown-item"
                        onClick={() => navigateTo('/agent/my-tickets')}
                        type="button"
                      >
                        Mes tickets
                      </button>
                      <button
                        className="workspace-nav-dropdown-item"
                        onClick={() => navigateTo('/agent/unassigned-tickets')}
                        type="button"
                      >
                        Non assignés
                      </button>
                      <button
                        className="workspace-nav-dropdown-item"
                        onClick={() => navigateTo('/agent/assigned-to-me')}
                        type="button"
                      >
                        Assignés à moi
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }

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
              onClick={() => navigateTo(homeRoute)}
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

            <div className="workspace-profile-menu" ref={profileMenuRef}>
              <button
                aria-label="Ouvrir le menu profil"
                className="workspace-profile-trigger is-compact"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                type="button"
              >
                <span className="workspace-profile-avatar">{userInitials}</span>
                <ChevronDown
                  className={isProfileMenuOpen ? 'is-open' : ''}
                  size={16}
                  strokeWidth={2}
                />
              </button>

              {isProfileMenuOpen ? (
                <div className="workspace-profile-menu-popover">
                  <div className="workspace-profile-menu-header">
                    <span className="workspace-profile-avatar is-large">
                      {userInitials}
                    </span>
                    <div>
                      <strong>{userDisplayName}</strong>
                      <span>
                        {session?.user.email ?? 'vision@jarvis.local'}
                      </span>
                    </div>
                  </div>

                  <div className="workspace-profile-menu-list">
                    <button
                      className="workspace-profile-menu-item"
                      type="button"
                    >
                      <User size={16} strokeWidth={2} />
                      <span>Profil</span>
                    </button>

                    <button
                      className="workspace-profile-menu-item"
                      type="button"
                    >
                      <Settings size={16} strokeWidth={2} />
                      <span>Parametres</span>
                    </button>

                    <button
                      className="workspace-profile-menu-item"
                      type="button"
                    >
                      <SlidersHorizontal size={16} strokeWidth={2} />
                      <span>Preferences</span>
                    </button>

                    <button
                      className="workspace-profile-menu-item workspace-profile-menu-item--switch"
                      type="button"
                    >
                      <span className="workspace-profile-menu-item-copy">
                        <Moon size={16} strokeWidth={2} />
                        <span>Mode nuit</span>
                      </span>
                      <span
                        className="workspace-profile-switch"
                        aria-hidden="true"
                      >
                        <span className="workspace-profile-switch-thumb" />
                      </span>
                    </button>

                    <div className="workspace-profile-menu-divider" />

                    <button
                      className="workspace-profile-menu-item is-danger"
                      onClick={handleLogoutClick}
                      type="button"
                    >
                      <LogOut size={16} strokeWidth={2} />
                      <span>Fermer la session</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="app-main app-main--workspace">{children}</main>
      </div>
    </div>
  );
}
