import { BadRequestException } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestType } from '../../../domain/ticketing/request-type';
import { CreateRequestUseCase } from './create-request.use-case';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';

describe('CreateRequestUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the manual priority id before writing the request', async () => {
    const createRequest = jest.fn().mockResolvedValue('created-request');
    const ticketWriteRepository: TicketWriteRepository = {
      createIncident: jest.fn(),
      createRequest,
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
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
    };
    const useCase = new CreateRequestUseCase(
      ticketWriteRepository,
      priorityRepository,
    );

    await expect(
      useCase.execute({
        categoryId: 'category-1',
        createdByUserId: 'user-1',
        description: 'Besoin d un acces VPN',
        priorityId: 'priority-medium',
        requestType: RequestType.ACCESS,
        title: 'Demande accès VPN',
      }),
    ).resolves.toBe('created-request');

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
  });

  it('rejects the command when the provided priority id is unknown', async () => {
    const ticketWriteRepository: TicketWriteRepository = {
      createIncident: jest.fn(),
      createRequest: jest.fn(),
    };
    const priorityRepository: ReferentialPriorityReadRepository = {
      listPriorities: jest.fn().mockResolvedValue([]),
    };
    const useCase = new CreateRequestUseCase(
      ticketWriteRepository,
      priorityRepository,
    );

    await expect(
      useCase.execute({
        categoryId: 'category-1',
        createdByUserId: 'user-1',
        description: 'Besoin d un acces VPN',
        priorityId: 'unknown-priority',
        title: 'Demande accès VPN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
