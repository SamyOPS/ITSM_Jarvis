import { ServiceUnavailableException } from '@nestjs/common';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { TicketType } from '../../domain/ticketing/ticket-type';
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

  it('maps embedded incident rows returned as an object', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            assigned_to_user_id: null,
            assignment_group_id: null,
            category_id: 'category-1',
            channel_id: null,
            ci_id: null,
            created_at: '2026-04-02T08:00:00.000Z',
            created_by_user_id: 'creator-1',
            description: 'VPN inaccessible',
            id: 'ticket-1',
            incidents: {
              impact: 'HIGH',
              root_cause: null,
              ticket_id: 'ticket-1',
              urgency: 'MEDIUM',
              workaround: null,
            },
            number: 'TICK-000001',
            priority_id: 'priority-1',
            requests: null,
            requested_for_user_id: null,
            service_id: null,
            status: TicketStatus.OPEN,
            title: 'VPN KO',
            type: TicketType.INCIDENT,
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([{ id: 'priority-1', name: 'HIGH' }]),
      });

    const repository = new SupabaseTicketWriteRepository();

    await expect(repository.getTicketById('ticket-1')).resolves.toMatchObject({
      incident: {
        impact: 'HIGH',
        ticketId: 'ticket-1',
        urgency: 'MEDIUM',
      },
      priorityName: 'HIGH',
      ticket: {
        id: 'ticket-1',
        number: 'TICK-000001',
      },
    });
  });

  it('filters internal comments out when requested', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          author_user_id: 'user-1',
          body: 'Commentaire public',
          created_at: '2026-04-02T08:10:00.000Z',
          id: 'comment-1',
          is_internal: false,
          ticket_id: 'ticket-1',
        },
      ]),
    });

    const repository = new SupabaseTicketWriteRepository();
    const comments = await repository.listTicketComments({
      includeInternal: false,
      ticketId: 'ticket-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/ticket_comments?order=created_at.asc&select=id%2Cticket_id%2Cauthor_user_id%2Cbody%2Cis_internal%2Ccreated_at&ticket_id=eq.ticket-1&is_internal=eq.false',
      ),
      expect.any(Object),
    );
    expect(comments).toEqual([
      expect.objectContaining({
        body: 'Commentaire public',
        id: 'comment-1',
        isInternal: false,
        ticketId: 'ticket-1',
      }),
    ]);
  });

  it('creates a ticket comment through Supabase', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          author_user_id: 'user-1',
          body: 'Note interne',
          created_at: '2026-04-02T08:12:00.000Z',
          id: 'comment-1',
          is_internal: true,
          ticket_id: 'ticket-1',
        },
      ]),
    });

    const repository = new SupabaseTicketWriteRepository();

    await expect(
      repository.addTicketComment({
        authorUserId: 'user-1',
        body: 'Note interne',
        isInternal: true,
        ticketId: 'ticket-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        authorUserId: 'user-1',
        body: 'Note interne',
        id: 'comment-1',
        isInternal: true,
        ticketId: 'ticket-1',
      }),
    );
  });

  it('fails when Supabase config is missing', async () => {
    process.env.SUPABASE_URL = '';

    const repository = new SupabaseTicketWriteRepository();

    await expect(
      repository.listTicketComments({
        includeInternal: true,
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
