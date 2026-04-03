import { BadRequestException } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { CreateIncidentUseCase } from './create-incident.use-case';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';

describe('CreateIncidentUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('derives the priority from impact and urgency before writing the incident', async () => {
    const createIncident = jest.fn().mockResolvedValue('created-incident');
    const ticketWriteRepository: TicketWriteRepository = {
      createIncident,
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-high', PriorityName.HIGH, 3, 4, 8),
        ]),
    };
    const useCase = new CreateIncidentUseCase(
      ticketWriteRepository,
      priorityRepository,
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
    ).resolves.toBe('created-incident');

    expect(createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        priorityId: 'priority-high',
        priorityName: PriorityName.HIGH,
        responseDueAt: '2026-04-03T14:00:00.000Z',
        resolutionDueAt: '2026-04-03T18:00:00.000Z',
      }),
    );
  });

  it('rejects the command when the derived priority is missing in referentials', async () => {
    const ticketWriteRepository: TicketWriteRepository = {
      createIncident: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest.fn().mockResolvedValue([]),
    };
    const useCase = new CreateIncidentUseCase(
      ticketWriteRepository,
      priorityRepository,
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
