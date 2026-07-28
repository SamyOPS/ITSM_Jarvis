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

  if (pathname.startsWith('/knowledge/articles/')) {
    return routeMap.get('/knowledge/articles') ?? null;
  }

  if (pathname.startsWith('/parc/cis/') && pathname !== '/parc/cis/new') {
    return routeMap.get('/parc/cis') ?? null;
  }

  if (
    pathname === '/' ||
    pathname === '/admin/groups' ||
    pathname === '/admin/license' ||
    pathname === '/admin/trash' ||
    pathname === '/admin/users' ||
    pathname === '/agent' ||
    pathname === '/agent/archives' ||
    pathname === '/agent/incidents/new' ||
    pathname === '/agent/my-tickets' ||
    pathname === '/agent/requests/new' ||
    pathname === '/agent/tickets' ||
    pathname === '/knowledge/articles' ||
    pathname === '/parc/cis/new' ||
    pathname === '/parc/cis' ||
    pathname === '/reports' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/auth/reset-password'
  ) {
    return routeMap.get(pathname) ?? null;
  }

  return null;
}
