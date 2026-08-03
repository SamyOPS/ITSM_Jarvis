import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseTokenValidatorService } from './supabase-token-validator.service';
import { UserRole } from '../../domain/auth/user-role';

describe('SupabaseTokenValidatorService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('prefers the role stored in public.users', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          app_metadata: { role: 'DEMANDEUR' },
          email: 'admin@example.com',
          id: 'user-1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            first_name: 'Alice',
            is_active: true,
            last_name: 'Martin',
            role: 'ADMIN',
          },
        ]),
      }) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).resolves.toEqual({
      accessToken: 'token',
      canManageAssets: false,
      canManageKnowledgeBase: false,
      canValidateKnowledgeBase: false,
      email: 'admin@example.com',
      firstName: 'Alice',
      id: 'user-1',
      isVip: false,
      lastName: 'Martin',
      role: UserRole.ADMIN,
    });
  });

  it('falls back to the token metadata when no public.users row is returned', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          app_metadata: { role: 'AGENT' },
          email: 'agent@example.com',
          id: 'user-2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      }) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).resolves.toEqual({
      accessToken: 'token',
      canManageAssets: false,
      canManageKnowledgeBase: false,
      canValidateKnowledgeBase: false,
      email: 'agent@example.com',
      firstName: null,
      id: 'user-2',
      isVip: false,
      lastName: null,
      role: UserRole.AGENT,
    });
  });

  it('throws when Supabase auth config is incomplete', async () => {
    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when the backend cannot reach Supabase auth', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network')) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when Supabase rejects the token', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when the public user profile is inactive', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          app_metadata: { role: 'DEMANDEUR' },
          email: 'inactive@example.com',
          id: 'user-inactive',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            first_name: 'Inactive',
            is_active: false,
            last_name: 'User',
            role: 'DEMANDEUR',
          },
        ]),
      }) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when the backend cannot reach the profile lookup', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          app_metadata: { role: 'ADMIN' },
          email: 'admin@example.com',
          id: 'user-1',
        }),
      })
      .mockRejectedValueOnce(new Error('network')) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
