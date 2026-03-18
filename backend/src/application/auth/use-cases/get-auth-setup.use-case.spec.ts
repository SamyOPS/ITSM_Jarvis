import { GetAuthSetupUseCase } from './get-auth-setup.use-case';

describe('GetAuthSetupUseCase', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns a ready snapshot when Supabase variables are present', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const useCase = new GetAuthSetupUseCase();

    expect(useCase.execute()).toEqual({
      provider: 'supabase',
      ready: true,
      roles: ['USER', 'AGENT', 'ADMIN'],
      supabase: {
        hasAnonKey: true,
        hasServiceRoleKey: true,
        hasUrl: true,
      },
    });
  });
});
