import { describe, expect, it } from 'vitest';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  canAccessRoute,
  getHomeRoute,
  getVisibleRoutes,
} from './access-control';

function buildSession(
  role: AuthSessionSnapshot['user']['role'],
): AuthSessionSnapshot {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      accessToken: 'access-token',
      email: `${role.toLowerCase()}@example.test`,
      firstName: role,
      id: `user-${role.toLowerCase()}`,
      lastName: 'User',
      role,
    },
  };
}

describe('access-control', () => {
  it('blocks protected routes when there is no session', () => {
    expect(canAccessRoute('/reports', null)).toBe(false);
    expect(canAccessRoute('/admin', null)).toBe(false);
    expect(canAccessRoute('/login', null)).toBe(true);
  });

  it('lets demandeur access ticket routes but not reports or admin', () => {
    const session = buildSession('DEMANDEUR');

    expect(canAccessRoute('/agent/tickets', session)).toBe(true);
    expect(canAccessRoute('/reports', session)).toBe(false);
    expect(canAccessRoute('/admin', session)).toBe(false);
  });

  it('lets agent access reports but not admin', () => {
    const session = buildSession('AGENT');

    expect(canAccessRoute('/reports', session)).toBe(true);
    expect(canAccessRoute('/admin', session)).toBe(false);
  });

  it('lets admin access reports and admin routes', () => {
    const session = buildSession('ADMIN');

    expect(canAccessRoute('/reports', session)).toBe(true);
    expect(canAccessRoute('/admin', session)).toBe(true);
    expect(canAccessRoute('/admin/users', session)).toBe(true);
  });

  it('returns the expected home route for each role', () => {
    expect(getHomeRoute(buildSession('DEMANDEUR'))).toBe('/');
    expect(getHomeRoute(buildSession('AGENT'))).toBe('/reports');
    expect(getHomeRoute(buildSession('ADMIN'))).toBe('/reports');
    expect(getHomeRoute(null)).toBe('/');
  });

  it('shows the reduced visible route set for demandeur', () => {
    const visibleRoutes = getVisibleRoutes(buildSession('DEMANDEUR'));

    expect(visibleRoutes).toEqual(['/agent/tickets']);
  });

  it('shows reports and admin routes for admin', () => {
    const visibleRoutes = getVisibleRoutes(buildSession('ADMIN'));

    expect(visibleRoutes).toContain('/reports');
    expect(visibleRoutes).toContain('/admin');
    expect(visibleRoutes).toContain('/admin/users');
    expect(visibleRoutes).not.toContain('/login');
  });
});
