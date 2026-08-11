import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  House,
  LogOut,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import {
  canAccessRoute,
  getHomeRoute,
} from '../../application/auth/access-control';
import {
  ROUTES,
  type RouteDefinition,
  type RoutePath,
} from '../../domain/navigation/route';
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
  formatNotificationDate,
  getCurrentBreadcrumbRoute,
  getRouteDisplayTitle,
  getUserDisplayName,
  getUserInitials,
  isRouteActive,
  navigateToHomeDashboard,
  routeIcons,
} from './app-shell.helpers';
import type { AppShellProps } from './app-shell.types';

type SidebarRouteGroup = {
  label: string;
  routes: readonly RoutePath[];
};

const sidebarRouteGroups: readonly SidebarRouteGroup[] = [
  {
    label: 'Accueil',
    routes: ['/reports'],
  },
  {
    label: 'Tickets',
    routes: ['/agent/incidents/new', '/agent/requests/new', '/agent/tickets'],
  },
  {
    label: 'Parc',
    routes: [
      '/parc/my-equipment',
      '/parc/cis/new',
      '/parc/cis',
      '/knowledge/articles',
    ],
  },
  {
    label: 'Administration',
    routes: [
      '/admin/users',
      '/admin/groups',
      '/admin/license',
      '/admin/trash',
      '/agent/archives',
    ],
  },
];

const requesterSidebarRouteGroups: readonly SidebarRouteGroup[] = [
  {
    label: 'Tickets',
    routes: ['/agent/tickets', '/agent/incidents/new', '/agent/requests/new'],
  },
  {
    label: 'Parc',
    routes: ['/parc/my-equipment', '/knowledge/articles'],
  },
];

function isRouteDefinition(
  route: RouteDefinition | null,
): route is RouteDefinition {
  return route !== null;
}

export function AppShell({
  children,
  isAuthenticated,
  onLogout,
  pathname,
  session,
}: AppShellProps) {
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
  const sidebarRef = useRef<HTMLElement | null>(null);
  const ticketMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const isWorkspaceShell = isAuthenticated;
  const isLoginShell = pathname === '/login';
  const isReportsRoute = pathname.startsWith('/reports');
  const workspaceShellClassName = isReportsRoute
    ? 'app-shell app-shell--workspace app-shell--reports'
    : 'app-shell app-shell--workspace';
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
  const effectiveSidebarRouteGroups =
    session?.user.role === 'DEMANDEUR'
      ? requesterSidebarRouteGroups
      : sidebarRouteGroups;
  const sidebarGroups = effectiveSidebarRouteGroups
    .map((group) => ({
      label: group.label,
      routes: group.routes
        .map((path) => ROUTES.find((route) => route.path === path) ?? null)
        .filter(isRouteDefinition)
        .filter((route) => canAccessRoute(route.path, session)),
    }))
    .filter((group) => group.routes.length > 0);

  useEffect(() => {
    document.body.classList.toggle('app-body--reports', isReportsRoute);

    return () => {
      document.body.classList.remove('app-body--reports');
    };
  }, [isReportsRoute]);

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

  function handleLogoutClick(): void {
    setIsProfileMenuOpen(false);
    onLogout();
  }

  function handleSidebarMouseLeave(): void {
    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLElement &&
      sidebarRef.current?.contains(activeElement)
    ) {
      activeElement.blur();
    }
  }

  if (isLoginShell) {
    return <div className="app-shell app-shell--login">{children}</div>;
  }

  if (!isWorkspaceShell) {
    return <div className="app-shell app-shell--login">{children}</div>;
  }

  return (
    <div className={workspaceShellClassName}>
      <aside
        className="workspace-sidebar"
        onMouseLeave={handleSidebarMouseLeave}
        ref={sidebarRef}
      >
        <div className="workspace-sidebar-header">
          <div className="workspace-sidebar-brand">
            <div className="workspace-sidebar-brand-copy">
              <strong>Vision</strong>
              <span>By JarvisConnect</span>
            </div>
          </div>
        </div>

        <div className="workspace-sidebar-divider" />

        <nav
          aria-label="Navigation principale"
          className="workspace-sidebar-nav"
        >
          {sidebarGroups.map((group, groupIndex) => (
            <div className="workspace-sidebar-group" key={groupIndex}>
              {groupIndex > 0 ? (
                <div className="workspace-sidebar-separator" />
              ) : null}

              <span className="workspace-sidebar-group-title">
                {group.label}
              </span>

              {group.routes.map((route) => {
                const Icon = routeIcons[route.path] ?? House;
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
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="workspace-sidebar-footer">
          <strong>{userDisplayName}</strong>
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

                  <span className="workspace-breadcrumb-item workspace-breadcrumb-current workspace-breadcrumb-current-page">
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
                <span className="workspace-profile-avatar">
                  {session?.user.profilePhotoUrl ? (
                    <img alt="" src={session.user.profilePhotoUrl} />
                  ) : (
                    <span className="workspace-profile-avatar-label">
                      {userInitials}
                    </span>
                  )}
                </span>
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
                      {session?.user.profilePhotoUrl ? (
                        <img alt="" src={session.user.profilePhotoUrl} />
                      ) : (
                        userInitials
                      )}
                    </span>
                    <div>
                      <span className="workspace-profile-menu-identity">
                        <strong>{userDisplayName}</strong>
                        {session?.user.isVip ? (
                          <span className="workspace-profile-vip-badge">
                            VIP
                          </span>
                        ) : null}
                      </span>
                      <span className="workspace-profile-menu-email">
                        {session?.user.email ?? 'vision@jarvis.local'}
                      </span>
                    </div>
                  </div>

                  <div className="workspace-profile-menu-list">
                    <button
                      className="workspace-profile-menu-item"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigateTo('/settings');
                      }}
                      type="button"
                    >
                      <Settings size={16} strokeWidth={2} />
                      <span>Parametres</span>
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
