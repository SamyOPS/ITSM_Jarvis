import { ServiceUnavailableException } from '@nestjs/common';
import { SupabaseReferentialReaderService } from './supabase-referential-reader.service';

describe('SupabaseReferentialReaderService', () => {
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

  it('maps category rows from Supabase', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'cat-1', name: 'Hardware', parent_id: null },
        { id: 'cat-2', name: 'Laptop', parent_id: 'cat-1' },
      ],
    });

    const service = new SupabaseReferentialReaderService();

    await expect(service.listCategories()).resolves.toEqual([
      { id: 'cat-1', name: 'Hardware', parentId: null },
      { id: 'cat-2', name: 'Laptop', parentId: 'cat-1' },
    ]);
  });

  it('fails when Supabase config is missing', async () => {
    process.env.SUPABASE_URL = '';

    const service = new SupabaseReferentialReaderService();

    await expect(service.listServices()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('fails when Supabase returns an error response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const service = new SupabaseReferentialReaderService();

    await expect(service.listChannels()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
