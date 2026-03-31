import { ServiceUnavailableException } from '@nestjs/common';
import { ReferentialCategory } from '../../domain/referentials/referential-category';
import { ReferentialCi } from '../../domain/referentials/referential-ci';
import { SupabaseReferentialReadRepository } from './supabase-referential-read.repository';

describe('SupabaseReferentialReadRepository', () => {
  const originalEnv = { ...process.env };
  const fetchMock = jest.fn();

  beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      SUPABASE_ANON_KEY: 'anon-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('maps category rows to domain entities', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: 'cat-1', name: 'Hardware', parent_id: null },
          { id: 'cat-2', name: 'Laptop', parent_id: 'cat-1' },
        ]),
    });

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.listCategories()).resolves.toEqual([
      new ReferentialCategory('cat-1', 'Hardware', null),
      new ReferentialCategory('cat-2', 'Laptop', 'cat-1'),
    ]);
  });

  it('maps CI rows to domain entities', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 'ci-1',
            name: 'Laptop N1',
            ci_type_id: 'ci-type-1',
            status: 'IN_SERVICE',
            assigned_user_id: null,
            serial_number: 'ABC-123',
          },
        ]),
    });

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.listCis()).resolves.toEqual([
      new ReferentialCi(
        'ci-1',
        'Laptop N1',
        'ci-type-1',
        'IN_SERVICE',
        null,
        'ABC-123',
      ),
    ]);
  });

  it('fails when Supabase config is missing', async () => {
    process.env.SUPABASE_URL = '';

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.listServices()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('fails when Supabase returns an error response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.listChannels()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
