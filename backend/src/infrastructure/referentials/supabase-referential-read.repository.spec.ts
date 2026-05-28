import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { ReferentialCategory } from '../../domain/referentials/referential-category';
import { ReferentialCi } from '../../domain/referentials/referential-ci';
import { ReferentialChannel } from '../../domain/referentials/referential-channel';
import { SupabaseReferentialReadRepository } from './supabase-referential-read.repository';

describe('SupabaseReferentialReadRepository', () => {
  const originalEnv = { ...process.env };
  const fetchMock = jest.fn<Promise<unknown>, []>();

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
      json: jest.fn().mockResolvedValue([
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
      json: jest.fn().mockResolvedValue([
        {
          id: 'ci-1',
          name: 'Laptop N1',
          ci_type_id: 'ci-type-1',
          status: 'IN_SERVICE',
          assigned_user_id: null,
          serial_number: 'ABC-123',
          brand: 'Dell',
          model: 'Latitude 5440',
          location: 'Bureau 101',
          purchase_date: '2026-05-01',
          warranty_end_date: '2029-05-01',
          ip_address: '10.0.0.5',
          mac_address: 'AA:BB:CC:DD:EE:FF',
          comment: 'Poste principal',
          archived_at: null,
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
        'Dell',
        'Latitude 5440',
        'Bureau 101',
        '2026-05-01',
        '2029-05-01',
        '10.0.0.5',
        'AA:BB:CC:DD:EE:FF',
        'Poste principal',
        null,
      ),
    ]);
  });

  it('creates a channel through Supabase', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ id: 'channel-1', name: 'PORTAL' }]),
    });

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.createChannel({ name: 'PORTAL' })).resolves.toEqual(
      new ReferentialChannel('channel-1', 'PORTAL'),
    );
  });

  it('fails when Supabase config is missing', async () => {
    process.env.SUPABASE_URL = '';

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.listCategories()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('maps conflict responses on mutations', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        message: 'duplicate key value violates unique constraint',
      }),
    });

    const repository = new SupabaseReferentialReadRepository();

    await expect(repository.createChannel({ name: 'PORTAL' })).rejects.toThrow(
      ConflictException,
    );
  });
});
