import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { UserRole } from '../../domain/auth/user-role';
import type { RoutePath } from '../../domain/navigation/route';

const routeRoleRequirements: Partial<Record<RoutePath, readonly UserRole[]>> = {
  '/admin': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/agent': ['DEMANDEUR', 'AGENT', 'ADMIN'],
  '/agent/incidents/new': ['DEMANDEUR', 'AGENT', 'ADMIN'],
  '/agent/requests/new': ['DEMANDEUR', 'AGENT', 'ADMIN'],
  '/agent/tickets': ['DEMANDEUR', 'AGENT', 'ADMIN'],
  '/reports': ['AGENT', 'ADMIN'],
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

export function getVisibleRoutes(
  session: AuthSessionSnapshot | null,
): readonly RoutePath[] {
  return (
    [
      '/agent/incidents/new',
      '/agent/requests/new',
      '/agent/tickets',
      '/reports',
      '/admin',
      '/admin/users',
      '/login',
    ] as const
  )
    .filter((pathname) => pathname !== '/login' || !session)
    .filter((pathname) => canAccessRoute(pathname, session));
}
