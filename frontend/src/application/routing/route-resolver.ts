import { ROUTES, type RouteDefinition } from '../../domain/navigation/route';

const routeMap = new Map<RouteDefinition['path'], RouteDefinition>(
  ROUTES.map((route) => [route.path, route]),
);

export function resolveRoute(pathname: string): RouteDefinition | null {
  if (pathname === '/' || pathname === '/auth' || pathname === '/status') {
    return routeMap.get(pathname) ?? null;
  }

  return null;
}
