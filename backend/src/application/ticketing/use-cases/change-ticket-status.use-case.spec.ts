import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { ChangeTicketStatusUseCase } from './change-ticket-status.use-case';

describe('ChangeTicketStatusUseCase', () => {
  it('updates the ticket status when the workflow allows it and writes audit', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        null,
        null,
        null,
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.IN_PROGRESS,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        status: TicketStatus.IN_PROGRESS,
        ticketId: 'ticket-1',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.IN_PROGRESS,
      },
    });

    expect(updateStatus).toHaveBeenCalledWith(
      'ticket-1',
      TicketStatus.IN_PROGRESS,
    );
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'agent-1',
      eventType: TicketHistoryEventType.STATUS_CHANGED,
      payload: {
        fromStatus: TicketStatus.OPEN,
        toStatus: TicketStatus.IN_PROGRESS,
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects a forbidden workflow transition', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.CLOSED,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        null,
        null,
        null,
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(detail),
      } as unknown as TicketReadRepository,
      {
        updateStatus: jest.fn(),
      } as unknown as TicketWriteRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'agent-1',
        status: TicketStatus.IN_PROGRESS,
        ticketId: 'ticket-1',
      }),
    ).rejects.toThrow(
      'Ticket status transition CLOSED -> IN_PROGRESS is not allowed in V1.',
    );
  });

  it('allows moving a ticket from in progress to pending', async () => {
    const detail = new TicketDetail(
      new Ticket(
        'ticket-2',
        'TICK-000002',
        TicketType.INCIDENT,
        TicketStatus.IN_PROGRESS,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        null,
        null,
        null,
        '2026-03-31T10:00:00.000Z',
      ),
      null,
      null,
      null,
    );
    const getTicketById = jest
      .fn()
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        ticket: {
          ...detail.ticket,
          status: TicketStatus.PENDING,
        },
      });
    const updateStatus = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new ChangeTicketStatusUseCase(
      {
        getTicketById,
      } as unknown as TicketReadRepository,
      {
        updateStatus,
      } as unknown as TicketWriteRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorUserId: 'agent-1',
        status: TicketStatus.PENDING,
        ticketId: 'ticket-2',
      }),
    ).resolves.toMatchObject({
      ticket: {
        status: TicketStatus.PENDING,
      },
    });
  });
});
