import { ServiceUnavailableException } from '@nestjs/common';
import { TicketComment } from '../../domain/ticketing/ticket-comment';
import { SupabaseTicketWriteRepository } from './supabase-ticket-write.repository';

describe('SupabaseTicketWriteRepository', () => {
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

  it('maps comment rows to domain entities', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          author_user_id: 'agent-1',
          body: 'Analyse en cours',
          created_at: '2026-04-01T10:00:00.000Z',
          id: 'comment-1',
          is_internal: true,
          ticket_id: 'ticket-1',
        },
      ]),
    });

    const repository = new SupabaseTicketWriteRepository();

    await expect(
      repository.listTicketComments({
        includeInternal: true,
        ticketId: 'ticket-1',
      }),
    ).resolves.toEqual([
      new TicketComment(
        'comment-1',
        'ticket-1',
        'agent-1',
        'Analyse en cours',
        true,
        '2026-04-01T10:00:00.000Z',
      ),
    ]);
  });

  it('creates a ticket comment through Supabase', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          author_user_id: 'agent-1',
          body: 'Analyse en cours',
          created_at: '2026-04-01T10:00:00.000Z',
          id: 'comment-1',
          is_internal: false,
          ticket_id: 'ticket-1',
        },
      ]),
    });

    const repository = new SupabaseTicketWriteRepository();

    await expect(
      repository.addTicketComment({
        authorUserId: 'agent-1',
        body: 'Analyse en cours',
        isInternal: false,
        ticketId: 'ticket-1',
      }),
    ).resolves.toEqual(
      new TicketComment(
        'comment-1',
        'ticket-1',
        'agent-1',
        'Analyse en cours',
        false,
        '2026-04-01T10:00:00.000Z',
      ),
    );
  });

  it('fails when Supabase ticket config is missing', async () => {
    process.env.SUPABASE_URL = '';

    const repository = new SupabaseTicketWriteRepository();

    await expect(
      repository.listTicketComments({
        includeInternal: false,
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
