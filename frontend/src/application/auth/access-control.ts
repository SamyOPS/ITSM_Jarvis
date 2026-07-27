import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { UserRole } from '../../domain/auth/user-role';
import type { RoutePath } from '../../domain/navigation/route';

const routeRoleRequirements: Partial<Record<RoutePath, readonly UserRole[]>> = {
  '/admin/groups': ['ADMIN', 'SUPER_ADMIN'],
  '/admin/license': ['SUPER_ADMIN'],
  '/admin/users': ['ADMIN', 'SUPER_ADMIN'],
  '/agent': ['DEMANDEUR', 'AGENT', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'],
  '/agent/archives': ['ADMIN', 'SUPER_ADMIN'],
  '/agent/incidents/new': [
    'DEMANDEUR',
    'AGENT',
    'MANAGER',
    'ADMIN',
    'SUPER_ADMIN',
  ],
  '/agent/my-tickets': [
    'DEMANDEUR',
    'AGENT',
    'MANAGER',
    'ADMIN',
    'SUPER_ADMIN',
  ],
  '/agent/requests/new': [
    'DEMANDEUR',
    'AGENT',
    'MANAGER',
    'ADMIN',
    'SUPER_ADMIN',
  ],
  '/agent/tickets': ['DEMANDEUR', 'AGENT', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'],
  '/knowledge/articles': [
    'DEMANDEUR',
    'AGENT',
    'MANAGER',
    'ADMIN',
    'SUPER_ADMIN',
  ],
  '/parc/cis/new': ['ADMIN', 'SUPER_ADMIN'],
  '/parc/cis': ['ADMIN', 'SUPER_ADMIN'],
  '/reports': ['AGENT', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'],
};

export function canAccessRoute(
  pathname: RoutePath,
  session: AuthSessionSnapshot | null,
): boolean {
  const allowedRoles = routeRoleRequirements[pathname];

  if (!allowedRoles) {
    return true;
  }

  if (!session) {
    return false;
  }

  return allowedRoles.includes(session.user.role);
}

export function getHomeRoute(session: AuthSessionSnapshot | null): RoutePath {
  if (
    session?.user.role === 'AGENT' ||
    session?.user.role === 'MANAGER' ||
    session?.user.role === 'ADMIN' ||
    session?.user.role === 'SUPER_ADMIN'
  ) {
    return '/reports';
  }

  return '/';
}

export function getVisibleRoutes(
  session: AuthSessionSnapshot | null,
): readonly RoutePath[] {
  if (session?.user.role === 'DEMANDEUR') {
    return (['/knowledge/articles', '/agent/tickets', '/login'] as const)
      .filter((pathname) => pathname !== '/login' || !session)
      .filter((pathname) => canAccessRoute(pathname, session));
  }

  return (
    [
      '/reports',
      '/knowledge/articles',
      '/agent/tickets',
      '/agent/my-tickets',
      '/agent/archives',
      '/parc/cis/new',
      '/parc/cis',
      '/admin/users',
      '/admin/groups',
      '/admin/license',
      '/login',
    ] as const
  )
    .filter((pathname) => pathname !== '/login' || !session)
    .filter((pathname) => canAccessRoute(pathname, session));
}
