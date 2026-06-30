import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Boxes,
  ChevronDown,
  FileText,
  House,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Ticket,
  Trash2,
  User,
} from 'lucide-react';
import {
  getHomeRoute,
  getVisibleRoutes,
} from '../../application/auth/access-control';
import { ROUTES } from '../../domain/navigation/route';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationSnapshot,
} from '../../infrastructure/api/notifications-api';
import {
  administrationRouteOrder,
  formatNotificationDate,
  getCurrentBreadcrumbRoute,
  getRouteDisplayTitle,
  getUserDisplayName,
  getUserInitials,
  isRouteActive,
  navigateToHomeDashboard,
  routeIcons,
} from './app-shell.helpers';
import type { AppShellProps, SidebarMenuId } from './app-shell.types';

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
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSnapshot[]>(
    [],
  );
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [isDeletingAllNotifications, setIsDeletingAllNotifications] =
    useState(false);
  const ticketMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
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
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;
  const administrationRoutes = administrationRouteOrder
    .map((path) => visibleRoutes.find((route) => route.path === path) ?? null)
    .filter((route) => route !== null);
  const isAdministrationMenuOpen = openSidebarMenu === 'administration';
  const isParcMenuOpen = openSidebarMenu === 'parc';
  const isTicketCreateMenuOpen = openSidebarMenu === 'create-ticket';
  const parcRoutes = [
    visibleRoutes.find((route) => route.path === '/parc/cis/new') ?? null,
    visibleRoutes.find((route) => route.path === '/parc/cis') ?? null,
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

      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setIsNotificationMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function loadNotifications(): Promise<void> {
      try {
        const nextNotifications = await fetchNotifications(
          session!.accessToken,
        );

        if (!cancelled) {
          setNotifications(nextNotifications);
          setNotificationError(null);
        }
      } catch {
        if (!cancelled) {
          setNotificationError('Notifications temporairement indisponibles.');
        }
      }
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    }, 5 * 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session]);

  async function handleNotificationMenuToggle(): Promise<void> {
    const willOpen = !isNotificationMenuOpen;

    setIsNotificationMenuOpen(willOpen);
    setIsProfileMenuOpen(false);
    setIsTicketMenuOpen(false);

    if (!willOpen || !session) {
      return;
    }

    try {
      setNotifications(await fetchNotifications(session.accessToken));
      setNotificationError(null);
    } catch {
      setNotificationError('Notifications temporairement indisponibles.');
    }
  }

  async function handleNotificationClick(
    notification: NotificationSnapshot,
  ): Promise<void> {
    if (!session) {
      return;
    }

    if (!notification.readAt) {
      try {
        await markNotificationRead(session.accessToken, notification.id);
        const readAt = new Date().toISOString();

        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? { ...currentNotification, readAt }
              : currentNotification,
          ),
        );
      } catch {
        setNotificationError(
          'Impossible de marquer la notification comme lue.',
        );
      }
    }

    setIsNotificationMenuOpen(false);

    if (notification.link?.startsWith('/')) {
      navigateTo(notification.link);
    }
  }

  async function handleMarkAllNotificationsRead(): Promise<void> {
    if (!session || unreadNotificationCount === 0) {
      return;
    }

    try {
      await markAllNotificationsRead(session.accessToken);
      const readAt = new Date().toISOString();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? readAt,
        })),
      );
      setNotificationError(null);
    } catch {
      setNotificationError(
        'Impossible de marquer les notifications comme lues.',
      );
    }
  }

  async function handleDeleteNotification(
    notificationId: string,
  ): Promise<void> {
    if (!session) {
      return;
    }

    try {
      await deleteNotification(session.accessToken, notificationId);
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => notification.id !== notificationId,
        ),
      );
      setNotificationError(null);
    } catch {
      setNotificationError('Impossible de supprimer la notification.');
    }
  }

  async function handleDeleteAllNotifications(): Promise<void> {
    if (
      !session ||
      notifications.length === 0 ||
      !window.confirm('Supprimer définitivement toutes les notifications ?')
    ) {
      return;
    }

    setIsDeletingAllNotifications(true);

    try {
      await deleteAllNotifications(session.accessToken);
      setNotifications([]);
      setNotificationError(null);
    } catch {
      setNotificationError('Impossible de supprimer toutes les notifications.');
    } finally {
      setIsDeletingAllNotifications(false);
    }
  }

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
              title="Mes tickets demandés"
              type="button"
            >
              <span className="workspace-nav-link-icon" aria-hidden="true">
                <Ticket size={18} strokeWidth={2} />
              </span>
              <strong className="workspace-nav-link-label">
                Mes tickets demandés
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
              route.path === '/admin/groups' ||
              route.path === '/admin/users' ||
              route.path === '/parc/cis/new' ||
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
                  <Boxes size={18} strokeWidth={2} />
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
                    const Icon = routeIcons[route.path] ?? Boxes;

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
                    const Icon = routeIcons[route.path] ?? Boxes;

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

            <div
              className="workspace-notification-menu"
              ref={notificationMenuRef}
            >
              <button
                aria-expanded={isNotificationMenuOpen}
                aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} non lues` : ''}`}
                className="workspace-notification-button"
                onClick={() => void handleNotificationMenuToggle()}
                type="button"
              >
                <Bell size={18} strokeWidth={2} />
                {unreadNotificationCount > 0 ? (
                  <span className="workspace-notification-badge">
                    {unreadNotificationCount > 99
                      ? '99+'
                      : unreadNotificationCount}
                  </span>
                ) : null}
              </button>

              {isNotificationMenuOpen ? (
                <section
                  aria-label="Centre de notifications"
                  className="workspace-notification-popover"
                >
                  <header className="workspace-notification-header">
                    <div className="workspace-notification-header-copy">
                      <strong>Notifications</strong>
                      <span>
                        {unreadNotificationCount > 0
                          ? `${unreadNotificationCount} non lue${unreadNotificationCount > 1 ? 's' : ''}`
                          : 'Tout est à jour'}
                      </span>
                    </div>

                    <div className="workspace-notification-header-actions">
                      <button
                        disabled={unreadNotificationCount === 0}
                        onClick={() => void handleMarkAllNotificationsRead()}
                        type="button"
                      >
                        Tout marquer comme lu
                      </button>

                      <button
                        className="is-danger"
                        disabled={
                          notifications.length === 0 ||
                          isDeletingAllNotifications
                        }
                        onClick={() => void handleDeleteAllNotifications()}
                        type="button"
                      >
                        {isDeletingAllNotifications
                          ? 'Suppression...'
                          : 'Tout supprimer'}
                      </button>
                    </div>
                  </header>

                  {notificationError ? (
                    <p className="workspace-notification-error">
                      {notificationError}
                    </p>
                  ) : null}

                  <div className="workspace-notification-list">
                    {notifications.length === 0 ? (
                      <p className="workspace-notification-empty">
                        Aucune notification pour le moment.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          className={
                            notification.readAt
                              ? 'workspace-notification-item'
                              : 'workspace-notification-item is-unread'
                          }
                          key={notification.id}
                        >
                          <button
                            className="workspace-notification-open-button"
                            onClick={() =>
                              void handleNotificationClick(notification)
                            }
                            type="button"
                          >
                            <i aria-hidden="true" />
                            <span>
                              <strong>{notification.title}</strong>
                              <span>{notification.message}</span>
                              <time dateTime={notification.createdAt}>
                                {formatNotificationDate(notification.createdAt)}
                              </time>
                            </span>
                          </button>

                          <button
                            aria-label={`Supprimer la notification ${notification.title}`}
                            className="workspace-notification-delete-button"
                            onClick={() =>
                              void handleDeleteNotification(notification.id)
                            }
                            title="Supprimer"
                            type="button"
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
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
