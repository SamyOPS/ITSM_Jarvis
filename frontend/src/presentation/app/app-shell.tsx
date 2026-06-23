import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  ChevronDown,
  FileText,
  BookOpen,
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

type SidebarMenuId = 'administration' | 'create-ticket' | 'parc';

const administrationRouteOrder: RoutePath[] = [
  '/admin/users',
  '/admin/groups',
  '/agent/archives',
];

const routeIcons: Partial<Record<RoutePath, LucideIcon>> = {
  '/': LayoutDashboard,
  '/admin/groups': Users,
  '/admin/users': User,
  '/agent': LayoutDashboard,
  '/agent/archives': Archive,
  '/agent/incidents/new': AlertTriangle,
  '/agent/my-tickets': Ticket,
  '/agent/requests/new': FileText,
  '/agent/tickets': ListChecks,
  '/knowledge/articles': BookOpen,
  '/parc/ci-types': SlidersHorizontal,
  '/parc/cis': Settings,
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

  if (routePath === '/agent/tickets') {
    return 'Tous les tickets';
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

function navigateToHomeDashboard(homeRoute: RoutePath, pathname: string): void {
  if (homeRoute !== '/reports') {
    navigateTo(homeRoute);

    return;
  }

  if (pathname === '/reports') {
    window.dispatchEvent(new CustomEvent('reports:show-dashboard'));

    return;
  }

  navigateTo('/reports');
}

function getCurrentBreadcrumbRoute(
  pathname: string,

  session: AuthSessionSnapshot | null,
): { icon: LucideIcon; title: string } {
  const exactRoute = ROUTES.find((route) => route.path === pathname);

  if (exactRoute) {
    return {
      icon: routeIcons[exactRoute.path] ?? FileText,
      title:
        exactRoute.path === '/agent/tickets'
          ? 'Tous les tickets'
          : getRouteDisplayTitle(exactRoute.path, exactRoute.title, session),
    };
  }

  if (pathname.startsWith('/agent/tickets/')) {
    return {
      icon: Ticket,
      title: 'Ticket',
    };
  }

  if (pathname.startsWith('/admin/users/')) {
    return {
      icon: User,
      title: 'Utilisateur',
    };
  }

  if (pathname.startsWith('/admin/groups/')) {
    return {
      icon: Users,
      title: 'Groupe',
    };
  }

  return {
    icon: LayoutDashboard,
    title: 'Tableau de bord',
  };
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
  const currentBreadcrumbRoute = useMemo(
    () => getCurrentBreadcrumbRoute(pathname, session),
    [pathname, session],
  );
  const CurrentBreadcrumbIcon = currentBreadcrumbRoute.icon;
  const userInitials = useMemo(() => getUserInitials(session), [session]);
  const userDisplayName = useMemo(() => getUserDisplayName(session), [session]);
  const administrationRoutes = administrationRouteOrder
    .map((path) => visibleRoutes.find((route) => route.path === path) ?? null)
    .filter((route) => route !== null);
  const isAdministrationMenuOpen = openSidebarMenu === 'administration';
  const isParcMenuOpen = openSidebarMenu === 'parc';
  const isTicketCreateMenuOpen = openSidebarMenu === 'create-ticket';
  const parcRoutes = [
    visibleRoutes.find((route) => route.path === '/parc/cis') ?? null,
    visibleRoutes.find((route) => route.path === '/parc/ci-types') ?? null,
  ].filter((route) => route !== null);

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
              title="Mes tickets"
              type="button"
            >
              <span className="workspace-nav-link-icon" aria-hidden="true">
                <Ticket size={18} strokeWidth={2} />
              </span>
              <strong className="workspace-nav-link-label">Mes tickets</strong>
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
              route.path === '/admin/groups' ||
              route.path === '/admin/users' ||
              route.path === '/parc/ci-types' ||
              route.path === '/parc/cis' ||
              route.path === '/agent/archives'
            ) {
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

          {parcRoutes.length > 0 ? (
            <div
              className={
                isParcMenuOpen
                  ? 'workspace-nav-dropdown is-open'
                  : 'workspace-nav-dropdown'
              }
            >
              <button
                aria-expanded={!isSidebarCollapsed && isParcMenuOpen}
                className="workspace-nav-link"
                onClick={() => {
                  if (isSidebarCollapsed) {
                    return;
                  }

                  setOpenSidebarMenu((current) =>
                    current === 'parc' ? null : 'parc',
                  );
                }}
                title="Parc"
                type="button"
              >
                <span className="workspace-nav-link-icon" aria-hidden="true">
                  <Settings size={18} strokeWidth={2} />
                </span>
                <strong className="workspace-nav-link-label">Parc</strong>
                <ChevronDown
                  className="workspace-nav-dropdown-chevron"
                  size={16}
                  strokeWidth={2}
                />
              </button>

              {isParcMenuOpen ? (
                <div className="workspace-nav-dropdown-list">
                  {parcRoutes.map((route) => {
                    const Icon = routeIcons[route.path] ?? Settings;

                    return (
                      <button
                        className={
                          isRouteActive(route.path, pathname)
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        key={route.path}
                        onClick={() => navigateTo(route.path)}
                        type="button"
                      >
                        <Icon size={15} strokeWidth={2} />
                        {route.title}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="workspace-nav-flyout">
                <div className="workspace-nav-flyout-title">Parc</div>
                <div className="workspace-nav-flyout-list">
                  {parcRoutes.map((route) => {
                    const Icon = routeIcons[route.path] ?? Settings;

                    return (
                      <button
                        className={
                          isRouteActive(route.path, pathname)
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        key={route.path}
                        onClick={() => navigateTo(route.path)}
                        type="button"
                      >
                        <Icon size={15} strokeWidth={2} />
                        {route.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {administrationRoutes.length > 0 ? (
            <div
              className={
                isAdministrationMenuOpen
                  ? 'workspace-nav-dropdown is-open'
                  : 'workspace-nav-dropdown'
              }
            >
              <button
                aria-expanded={!isSidebarCollapsed && isAdministrationMenuOpen}
                className="workspace-nav-link"
                onClick={() => {
                  if (isSidebarCollapsed) {
                    return;
                  }

                  setOpenSidebarMenu((current) =>
                    current === 'administration' ? null : 'administration',
                  );
                }}
                title="Administration"
                type="button"
              >
                <span className="workspace-nav-link-icon" aria-hidden="true">
                  <Shield size={18} strokeWidth={2} />
                </span>
                <strong className="workspace-nav-link-label">
                  Administration
                </strong>
                <ChevronDown
                  className="workspace-nav-dropdown-chevron"
                  size={16}
                  strokeWidth={2}
                />
              </button>

              {isAdministrationMenuOpen ? (
                <div className="workspace-nav-dropdown-list">
                  {administrationRoutes.map((route) => {
                    const Icon = routeIcons[route.path] ?? Ticket;
                    const routeTitle = getRouteDisplayTitle(
                      route.path,
                      route.title,
                      session,
                    );

                    return (
                      <button
                        className={
                          isRouteActive(route.path, pathname)
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        key={route.path}
                        onClick={() => navigateTo(route.path)}
                        type="button"
                      >
                        <Icon size={15} strokeWidth={2} />
                        {routeTitle}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="workspace-nav-flyout">
                <div className="workspace-nav-flyout-title">Administration</div>
                <div className="workspace-nav-flyout-list">
                  {administrationRoutes.map((route) => {
                    const Icon = routeIcons[route.path] ?? Ticket;
                    const routeTitle = getRouteDisplayTitle(
                      route.path,
                      route.title,
                      session,
                    );

                    return (
                      <button
                        className={
                          isRouteActive(route.path, pathname)
                            ? 'workspace-nav-dropdown-item is-active'
                            : 'workspace-nav-dropdown-item'
                        }
                        key={route.path}
                        onClick={() => navigateTo(route.path)}
                        type="button"
                      >
                        <Icon size={15} strokeWidth={2} />
                        {routeTitle}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </nav>

        <div className="workspace-sidebar-footer">
          <strong>{session?.user.email ?? 'Session locale'}</strong>
          <span>{session?.user.role ?? 'Aucun role'}</span>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-copy">
            <nav className="workspace-breadcrumb" aria-label="Fil d'ariane">
              <button
                className={
                  isHomeRoute
                    ? 'workspace-breadcrumb-item is-active'
                    : 'workspace-breadcrumb-item'
                }
                onClick={() => navigateToHomeDashboard(homeRoute, pathname)}
                type="button"
              >
                <House
                  className="workspace-breadcrumb-icon"
                  size={15}
                  strokeWidth={2.1}
                />

                <span>Accueil</span>
              </button>

              {!isHomeRoute ? (
                <>
                  <span className="workspace-breadcrumb-separator">/</span>

                  <span className="workspace-breadcrumb-item workspace-breadcrumb-current">
                    <CurrentBreadcrumbIcon
                      className="workspace-breadcrumb-icon"
                      size={15}
                      strokeWidth={2.1}
                    />

                    <span>{currentBreadcrumbRoute.title}</span>
                  </span>
                </>
              ) : null}
            </nav>
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
              aria-label="Notifications"
              className="workspace-notification-button"
              type="button"
            >
              <Bell size={18} strokeWidth={2} />
            </button>

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
