import { ROUTES, type RouteDefinition } from '../../domain/navigation/route';

const routeMap = new Map<RouteDefinition['path'], RouteDefinition>(
  ROUTES.map((route) => [route.path, route]),
);

export function resolveRoute(pathname: string): RouteDefinition | null {
  if (pathname.startsWith('/agent/archives/')) {
    return routeMap.get('/agent/archives') ?? null;
  }

  if (pathname.startsWith('/agent/tickets/')) {
    return routeMap.get('/agent/tickets') ?? null;
  }

  if (
    pathname === '/' ||
    pathname === '/admin' ||
    pathname === '/admin/users' ||
    pathname === '/agent' ||
    pathname === '/agent/archives' ||
    pathname === '/agent/assigned-to-me' ||
    pathname === '/agent/incidents/new' ||
    pathname === '/agent/my-tickets' ||
    pathname === '/agent/requests/new' ||
    pathname === '/agent/tickets' ||
    pathname === '/agent/unassigned-tickets' ||
    pathname === '/reports' ||
    pathname === '/login'
  ) {
    return routeMap.get(pathname) ?? null;
  }

  return null;
}
