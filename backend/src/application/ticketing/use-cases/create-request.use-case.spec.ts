import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { ReferentialChannel } from '../../../domain/referentials/referential-channel';
import { ReferentialChannelReadRepository } from '../../referentials/repositories/referential-channel-read.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestTicket } from '../../../domain/ticketing/request';
import { RequestType } from '../../../domain/ticketing/request-type';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketAuditService } from '../ticket-audit.service';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { CreateRequestUseCase } from './create-request.use-case';

describe('CreateRequestUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the manual priority id before writing the request and writes audit', async () => {
    const createdRequest = new CreatedRequest(
      new Ticket(
        'ticket-2',
        'TICK-000002',
        TicketType.REQUEST,
        TicketStatus.OPEN,
        'Demande acces VPN',
        'Besoin d un acces VPN',
        'priority-medium',
        'category-1',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-03T09:00:00.000Z',
        '2026-04-03T18:00:00.000Z',
        '2026-04-04T10:00:00.000Z',
      ),
      new RequestTicket('ticket-2', RequestType.ACCESS, null, null),
      PriorityName.MEDIUM,
    );
    const createRequest = jest.fn().mockResolvedValue(createdRequest);
    const write = jest.fn().mockResolvedValue(undefined);
    const ticketWriteRepository = {
      createIncident: jest.fn(),
      createRequest,
    } as unknown as TicketWriteRepository;
    const channelRepository = {
      listChannels: jest.fn().mockResolvedValue([]),
    } as unknown as ReferentialChannelReadRepository;
    const priorityRepository = {
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority(
            'priority-medium',
            PriorityName.MEDIUM,
            2,
            8,
            24,
          ),
        ]),
    } as ReferentialPriorityReadRepository;
    const useCase = new CreateRequestUseCase(
      ticketWriteRepository,
      channelRepository,
      priorityRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        categoryId: 'category-1',
        creatorRole: UserRole.AGENT,
        createdByUserId: 'user-1',
        description: 'Besoin d un acces VPN',
        priorityId: 'priority-medium',
        requestType: RequestType.ACCESS,
        title: 'Demande acces VPN',
      }),
    ).resolves.toBe(createdRequest);

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalStatus: null,
        priorityId: 'priority-medium',
        priorityName: PriorityName.MEDIUM,
        requestType: RequestType.ACCESS,
        responseDueAt: '2026-04-03T18:00:00.000Z',
        resolutionDueAt: '2026-04-04T10:00:00.000Z',
      }),
    );
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      eventType: TicketHistoryEventType.CREATED,
      payload: {
        status: TicketStatus.OPEN,
        ticketNumber: 'TICK-000002',
        type: TicketType.REQUEST,
      },
      ticketId: 'ticket-2',
    });
  });

  it('forces the portal channel when a requester creates a request', async () => {
    const createdRequest = new CreatedRequest(
      new Ticket(
        'ticket-2',
        'TICK-000002',
        TicketType.REQUEST,
        TicketStatus.OPEN,
        'Demande acces VPN',
        'Besoin d un acces VPN',
        'priority-medium',
        'category-1',
        'user-1',
        null,
        'channel-portal',
        null,
        null,
        null,
        '2026-04-03T09:00:00.000Z',
      ),
      new RequestTicket('ticket-2', RequestType.ACCESS, null, null),
      PriorityName.MEDIUM,
    );
    const createRequest = jest.fn().mockResolvedValue(createdRequest);
    const listChannels = jest
      .fn()
      .mockResolvedValue([new ReferentialChannel('channel-portal', 'PORTAL')]);
    const useCase = new CreateRequestUseCase(
      {
        createIncident: jest.fn(),
        createRequest,
      } as unknown as TicketWriteRepository,
      {
        listChannels,
      } as unknown as ReferentialChannelReadRepository,
      {
        listPriorities: jest
          .fn()
          .mockResolvedValue([
            new ReferentialPriority(
              'priority-medium',
              PriorityName.MEDIUM,
              2,
              8,
              24,
            ),
          ]),
      } as ReferentialPriorityReadRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await useCase.execute({
      categoryId: 'category-1',
      channelId: 'channel-email',
      creatorRole: UserRole.DEMANDEUR,
      createdByUserId: 'user-1',
      description: 'Besoin d un acces VPN',
      priorityId: 'priority-medium',
      requestType: RequestType.ACCESS,
      title: 'Demande acces VPN',
    });

    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: 'channel-portal',
      }),
    );
  });

  it('rejects the command when the provided priority id is unknown', async () => {
    const ticketWriteRepository = {
      createIncident: jest.fn(),
      createRequest: jest.fn(),
    } as unknown as TicketWriteRepository;
    const channelRepository = {
      listChannels: jest.fn().mockResolvedValue([]),
    } as unknown as ReferentialChannelReadRepository;
    const priorityRepository = {
      listPriorities: jest.fn().mockResolvedValue([]),
    } as ReferentialPriorityReadRepository;
    const useCase = new CreateRequestUseCase(
      ticketWriteRepository,
      channelRepository,
      priorityRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        categoryId: 'category-1',
        creatorRole: UserRole.AGENT,
        createdByUserId: 'user-1',
        description: 'Besoin d un acces VPN',
        priorityId: 'unknown-priority',
        title: 'Demande acces VPN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
