import { BadRequestException } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { Incident } from '../../../domain/ticketing/incident';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketAuditService } from '../ticket-audit.service';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { CreateIncidentUseCase } from './create-incident.use-case';

describe('CreateIncidentUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('derives the priority from impact and urgency before writing the incident and writes audit', async () => {
    const createdIncident = new CreatedIncident(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'VPN inaccessible',
        'priority-high',
        'category-1',
        'user-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-03T09:00:00.000Z',
        '2026-04-03T14:00:00.000Z',
        '2026-04-03T18:00:00.000Z',
      ),
      new Incident(
        'ticket-1',
        IncidentSeverity.HIGH,
        IncidentSeverity.MEDIUM,
        null,
        null,
      ),
      PriorityName.HIGH,
    );
    const createIncident = jest.fn().mockResolvedValue(createdIncident);
    const write = jest.fn().mockResolvedValue(undefined);
    const ticketWriteRepository = {
      createIncident,
    } as unknown as TicketWriteRepository;
    const priorityRepository = {
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-high', PriorityName.HIGH, 3, 4, 8),
        ]),
    } as ReferentialPriorityReadRepository;
    const useCase = new CreateIncidentUseCase(
      ticketWriteRepository,
      priorityRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        categoryId: 'category-1',
        createdByUserId: 'user-1',
        description: 'VPN inaccessible',
        impact: IncidentSeverity.HIGH,
        title: 'VPN KO',
        urgency: IncidentSeverity.MEDIUM,
      }),
    ).resolves.toBe(createdIncident);

    expect(createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        priorityId: 'priority-high',
        priorityName: PriorityName.HIGH,
        responseDueAt: '2026-04-03T14:00:00.000Z',
        resolutionDueAt: '2026-04-03T18:00:00.000Z',
      }),
    );
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      eventType: TicketHistoryEventType.CREATED,
      payload: {
        status: TicketStatus.OPEN,
        ticketNumber: 'TICK-000001',
        type: TicketType.INCIDENT,
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects the command when the derived priority is missing in referentials', async () => {
    const ticketWriteRepository = {
      createIncident: jest.fn(),
    } as unknown as TicketWriteRepository;
    const priorityRepository = {
      listPriorities: jest.fn().mockResolvedValue([]),
    } as ReferentialPriorityReadRepository;
    const useCase = new CreateIncidentUseCase(
      ticketWriteRepository,
      priorityRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        categoryId: 'category-1',
        createdByUserId: 'user-1',
        description: 'VPN inaccessible',
        impact: IncidentSeverity.HIGH,
        title: 'VPN KO',
        urgency: IncidentSeverity.HIGH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
