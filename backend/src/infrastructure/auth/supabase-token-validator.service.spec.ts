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

  it('maps a Supabase user payload to an authenticated user', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        app_metadata: { role: 'ADMIN' },
        email: 'admin@example.com',
        id: 'user-1',
      }),
    }) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).resolves.toEqual({
      accessToken: 'token',
      email: 'admin@example.com',
      id: 'user-1',
      role: UserRole.ADMIN,
    });
  });

  it('throws when Supabase auth config is incomplete', async () => {
    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('falls back to the service role key when the anon key is missing', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        app_metadata: { role: 'AGENT' },
        email: 'agent@example.com',
        id: 'user-2',
      }),
    }) as typeof fetch;

    const service = new SupabaseTokenValidatorService();

    await expect(service.validate('token')).resolves.toEqual({
      accessToken: 'token',
      email: 'agent@example.com',
      id: 'user-2',
      role: UserRole.AGENT,
    });
  });

  it('throws when the backend cannot reach Supabase auth', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof fetch;

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
});