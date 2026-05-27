import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  storeAuthSession,
} from './session-storage';

function buildSession(): AuthSessionSnapshot {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      accessToken: 'access-token',
      email: 'user@example.test',
      firstName: 'Test',
      id: 'user-1',
      lastName: 'User',
      role: 'AGENT',
    },
  };
}

describe('session-storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores and restores a session snapshot', () => {
    const session = buildSession();

    storeAuthSession(session);

    expect(readStoredAuthSession()).toEqual(session);
  });

  it('clears a stored session snapshot', () => {
    storeAuthSession(buildSession());

    clearStoredAuthSession();

    expect(readStoredAuthSession()).toBeNull();
  });

  it('removes invalid stored session data', () => {
    window.localStorage.setItem('tikia.auth.session', '{invalid-json');

    expect(readStoredAuthSession()).toBeNull();
    expect(window.localStorage.getItem('tikia.auth.session')).toBeNull();
  });
});
