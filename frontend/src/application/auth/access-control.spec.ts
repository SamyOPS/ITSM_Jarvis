import { describe, expect, it } from 'vitest';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  canAccessRoute,
  getHomeRoute,
  getVisibleRoutes,
} from './access-control';

function buildSession(
  role: AuthSessionSnapshot['user']['role'],
  userOverrides: Partial<AuthSessionSnapshot['user']> = {},
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
      ...userOverrides,
    },
  };
}

describe('access-control', () => {
  it('blocks protected routes when there is no session', () => {
    expect(canAccessRoute('/reports', null)).toBe(false);
    expect(canAccessRoute('/parc/cis', null)).toBe(false);
    expect(canAccessRoute('/login', null)).toBe(true);
  });

  it('lets demandeur access ticket routes but not reports or admin', () => {
    const session = buildSession('DEMANDEUR');

    expect(canAccessRoute('/agent/tickets', session)).toBe(true);
    expect(canAccessRoute('/knowledge/articles', session)).toBe(true);
    expect(canAccessRoute('/reports', session)).toBe(false);
    expect(canAccessRoute('/parc/cis', session)).toBe(false);
  });

  it('lets agent access reports but not admin', () => {
    const session = buildSession('AGENT');

    expect(canAccessRoute('/reports', session)).toBe(true);
    expect(canAccessRoute('/parc/cis', session)).toBe(true);
    expect(canAccessRoute('/parc/cis/new', session)).toBe(false);
  });

  it('lets agent with asset management permission create equipment', () => {
    const session = buildSession('AGENT', { canManageAssets: true });

    expect(canAccessRoute('/parc/cis/new', session)).toBe(true);
  });

  it('lets manager access admin-like routes except license', () => {
    const session = buildSession('MANAGER');

    expect(canAccessRoute('/reports', session)).toBe(true);
    expect(canAccessRoute('/agent/tickets', session)).toBe(true);
    expect(canAccessRoute('/knowledge/articles', session)).toBe(true);
    expect(canAccessRoute('/agent/archives', session)).toBe(true);
    expect(canAccessRoute('/parc/cis', session)).toBe(true);
    expect(canAccessRoute('/parc/cis/new', session)).toBe(false);
    expect(canAccessRoute('/admin/users', session)).toBe(true);
    expect(canAccessRoute('/admin/groups', session)).toBe(true);
    expect(canAccessRoute('/admin/license', session)).toBe(false);
    expect(canAccessRoute('/admin/trash', session)).toBe(false);
  });

  it('lets admin access reports and admin routes', () => {
    const session = buildSession('ADMIN');

    expect(canAccessRoute('/reports', session)).toBe(true);
    expect(canAccessRoute('/parc/cis', session)).toBe(true);
    expect(canAccessRoute('/parc/cis/new', session)).toBe(true);
    expect(canAccessRoute('/admin/users', session)).toBe(true);
    expect(canAccessRoute('/admin/license', session)).toBe(false);
    expect(canAccessRoute('/admin/trash', session)).toBe(false);
  });

  it('lets super admin access the license route', () => {
    const session = buildSession('SUPER_ADMIN');

    expect(canAccessRoute('/admin/license', session)).toBe(true);
    expect(canAccessRoute('/admin/trash', session)).toBe(true);
  });

  it('returns the expected home route for each role', () => {
    expect(getHomeRoute(buildSession('DEMANDEUR'))).toBe('/');
    expect(getHomeRoute(buildSession('AGENT'))).toBe('/reports');
    expect(getHomeRoute(buildSession('MANAGER'))).toBe('/reports');
    expect(getHomeRoute(buildSession('ADMIN'))).toBe('/reports');
    expect(getHomeRoute(buildSession('SUPER_ADMIN'))).toBe('/reports');
    expect(getHomeRoute(null)).toBe('/');
  });

  it('shows the reduced visible route set for demandeur', () => {
    const visibleRoutes = getVisibleRoutes(buildSession('DEMANDEUR'));

    expect(visibleRoutes).toEqual(['/knowledge/articles', '/agent/tickets']);
  });

  it('shows reports and admin routes for admin', () => {
    const visibleRoutes = getVisibleRoutes(buildSession('ADMIN'));

    expect(visibleRoutes).toContain('/reports');
    expect(visibleRoutes).toContain('/parc/cis/new');
    expect(visibleRoutes).toContain('/parc/cis');
    expect(visibleRoutes).toContain('/admin/users');
    expect(visibleRoutes).not.toContain('/admin/license');
    expect(visibleRoutes).not.toContain('/login');
  });

  it('shows the license route for super admin', () => {
    const visibleRoutes = getVisibleRoutes(buildSession('SUPER_ADMIN'));

    expect(visibleRoutes).toContain('/admin/license');
    expect(visibleRoutes).toContain('/admin/trash');
  });
});
