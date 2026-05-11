import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  LayoutDashboard,
  ListChecks,
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
  UserX,
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

type SidebarMenuId = 'create-ticket' | 'ticket-list';

const routeIcons: Partial<Record<RoutePath, LucideIcon>> = {
  '/': LayoutDashboard,
  '/admin': Shield,
  '/admin/users': Users,
  '/agent': LayoutDashboard,
  '/agent/archives': Archive,
  '/agent/assigned-to-me': User,
  '/agent/incidents/new': AlertTriangle,
  '/agent/my-tickets': Ticket,
  '/agent/requests/new': FileText,
  '/agent/tickets': ListChecks,
  '/agent/unassigned-tickets': UserX,
  '/reports': BarChart3,
};

function isRouteActive(routePath: RoutePath, pathname: string): boolean {
  if (routePath === '/agent/tickets') {
    return (
      pathname === '/agent/tickets' || pathname.startsWith('/agent/tickets/')
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

function getRouteDisplayTitle(
  routePath: RoutePath,
  routeTitle: string,
  session: AuthSessionSnapshot | null,
): string {
  if (routePath === '/agent/tickets' && session?.user.role === 'DEMANDEUR') {
    return 'Mes tickets';
  }

  return routeTitle;
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
  const [openSidebarMenu, setOpenSidebarMenu] = useState<SidebarMenuId | null>(
    null,
  );
  const [isTicketMenuOpen, setIsTicketMenuOpen] = useState(false);
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
  const isTicketCreateMenuOpen = openSidebarMenu === 'create-ticket';
  const isTicketListMenuOpen = openSidebarMenu === 'ticket-list';

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

  function handleSidebarToggle(): void {
    setOpenSidebarMenu(null);
    setIsSidebarCollapsed((current) => !current);
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
            onClick={handleSidebarToggle}
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
            if (route.path !== '/reports') {
              return null;
            }

            const Icon = routeIcons[route.path] ?? Ticket;
            const isActive = isRouteActive(route.path, pathname);
            const routeTitle = getRouteDisplayTitle(
              route.path,
              route.title,
              session,
            );

            return (
              <button
                className={
                  isActive
                    ? 'workspace-nav-link is-active'
                    : 'workspace-nav-link'
                }
                key={route.path}
                onClick={() => navigateTo(route.path)}
                title={routeTitle}
                type="button"
              >
                <span className="workspace-nav-link-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <strong className="workspace-nav-link-label">
                  {routeTitle}
                </strong>
              </button>
            );
          })}

          <div
            className={
              isTicketCreateMenuOpen
                ? 'workspace-nav-dropdown is-open'
                : 'workspace-nav-dropdown'
            }
          >
            <button
              aria-expanded={!isSidebarCollapsed && isTicketCreateMenuOpen}
              className="workspace-nav-link"
              onClick={() => {
                if (isSidebarCollapsed) {
                  return;
                }

                setOpenSidebarMenu((current) =>
                  current === 'create-ticket' ? null : 'create-ticket',
                );
              }}
              title="Créer un ticket"
              type="button"
            >
              <span className="workspace-nav-link-icon" aria-hidden="true">
                <Plus size={18} strokeWidth={2} />
              </span>
              <strong className="workspace-nav-link-label">
                Créer un ticket
              </strong>
              <ChevronDown
                className="workspace-nav-dropdown-chevron"
                size={16}
                strokeWidth={2}
              />
            </button>

            {isTicketCreateMenuOpen ? (
              <div className="workspace-nav-dropdown-list">
                <button
                  className={
                    pathname === '/agent/incidents/new'
                      ? 'workspace-nav-dropdown-item is-active'
                      : 'workspace-nav-dropdown-item'
                  }
                  onClick={() => navigateTo('/agent/incidents/new')}
                  type="button"
                >
                  <AlertTriangle size={15} strokeWidth={2} />
                  Créer un incident
                </button>
                <button
                  className={
                    pathname === '/agent/requests/new'
                      ? 'workspace-nav-dropdown-item is-active'
                      : 'workspace-nav-dropdown-item'
                  }
                  onClick={() => navigateTo('/agent/requests/new')}
                  type="button"
                >
                  <FileText size={15} strokeWidth={2} />
                  Créer une demande
                </button>
              </div>
            ) : null}

            <div className="workspace-nav-flyout">
              <div className="workspace-nav-flyout-title">Créer un ticket</div>
              <div className="workspace-nav-flyout-list">
                <button
                  className={
                    pathname === '/agent/incidents/new'
                      ? 'workspace-nav-dropdown-item is-active'
                      : 'workspace-nav-dropdown-item'
                  }
                  onClick={() => navigateTo('/agent/incidents/new')}
                  type="button"
                >
                  <AlertTriangle size={15} strokeWidth={2} />
                  Créer un incident
                </button>
                <button
                  className={
                    pathname === '/agent/requests/new'
                      ? 'workspace-nav-dropdown-item is-active'
                      : 'workspace-nav-dropdown-item'
                  }
                  onClick={() => navigateTo('/agent/requests/new')}
                  type="button"
                >
                  <FileText size={15} strokeWidth={2} />
                  Créer une demande
                </button>
              </div>
            </div>
          </div>

          {session?.user.role === 'DEMANDEUR' ? (
            <button
              className={
                pathname === '/agent/my-tickets'
                  ? 'workspace-nav-link is-active'
                  : 'workspace-nav-link'
              }
              onClick={() => navigateTo('/agent/my-tickets')}
              title="Mes tickets créés"
              type="button"
            >
              <span className="workspace-nav-link-icon" aria-hidden="true">
                <Ticket size={18} strokeWidth={2} />
              </span>
              <strong className="workspace-nav-link-label">
                Mes tickets créés
              </strong>
            </button>
          ) : null}

          {visibleRoutes.map((route) => {
            if (route.path === '/reports') {
              return null;
            }

            if (route.path === '/agent/my-tickets') {
              return null;
            }

            if (
              route.path === '/agent/tickets' &&
              session?.user.role === 'DEMANDEUR'
            ) {
              return null;
            }

            const Icon = routeIcons[route.path] ?? Ticket;
            const isActive = isRouteActive(route.path, pathname);
            const routeTitle = getRouteDisplayTitle(
              route.path,
              route.title,
              session,
            );
            const shouldShowTicketDropdown =
              route.path === '/agent/tickets' &&
              session?.user.role !== 'DEMANDEUR';
            const isTicketDropdownParentActive =
              shouldShowTicketDropdown &&
              pathname.startsWith('/agent/tickets/');

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
                    aria-expanded={!isSidebarCollapsed && isTicketListMenuOpen}
                    className={
                      isTicketDropdownParentActive
                        ? 'workspace-nav-link is-active'
                        : 'workspace-nav-link'
                    }
                    onClick={() => {
                      if (isSidebarCollapsed) {
                        return;
                      }

                      setOpenSidebarMenu((current) =>
                        current === 'ticket-list' ? null : 'ticket-list',
                      );
                    }}
                    title={routeTitle}
                    type="button"
                  >
                    <span
                      className="workspace-nav-link-icon"
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <strong className="workspace-nav-link-label">
                      {routeTitle}
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
                        className={
                          pathname === '/agent/tickets'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/tickets')}
                        type="button"
                      >
                        <ClipboardList size={15} strokeWidth={2} />
                        Tous les tickets
                      </button>
                      <button
                        className={
                          pathname === '/agent/unassigned-tickets'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/unassigned-tickets')}
                        type="button"
                      >
                        <UserX size={15} strokeWidth={2} />
                        Non assignés
                      </button>
                      <button
                        className={
                          pathname === '/agent/assigned-to-me'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/assigned-to-me')}
                        type="button"
                      >
                        <User size={15} strokeWidth={2} />
                        Assignés à moi
                      </button>
                      <button
                        className={
                          pathname === '/agent/my-tickets'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/my-tickets')}
                        type="button"
                      >
                        <Ticket size={15} strokeWidth={2} />
                        Mes tickets créés
                      </button>
                    </div>
                  ) : null}

                  <div className="workspace-nav-flyout">
                    <div className="workspace-nav-flyout-title">
                      {routeTitle}
                    </div>
                    <div className="workspace-nav-flyout-list">
                      <button
                        className={
                          pathname === '/agent/tickets'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/tickets')}
                        type="button"
                      >
                        <ClipboardList size={15} strokeWidth={2} />
                        Tous les tickets
                      </button>
                      <button
                        className={
                          pathname === '/agent/unassigned-tickets'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/unassigned-tickets')}
                        type="button"
                      >
                        <UserX size={15} strokeWidth={2} />
                        Non assignés
                      </button>
                      <button
                        className={
                          pathname === '/agent/assigned-to-me'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/assigned-to-me')}
                        type="button"
                      >
                        <User size={15} strokeWidth={2} />
                        Assignés à moi
                      </button>
                      <button
                        className={
                          pathname === '/agent/my-tickets'
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        onClick={() => navigateTo('/agent/my-tickets')}
                        type="button"
                      >
                        <Ticket size={15} strokeWidth={2} />
                        Mes tickets créés
                      </button>
                    </div>
                  </div>
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
                title={routeTitle}
                type="button"
              >
                <span className="workspace-nav-link-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <strong className="workspace-nav-link-label">
                  {routeTitle}
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
