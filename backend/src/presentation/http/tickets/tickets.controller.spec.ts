import { Test, TestingModule } from '@nestjs/testing';
import { ListTicketsUseCase } from '../../../application/ticketing/use-cases/list-tickets.use-case';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: ListTicketsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue([
              {
                assignedToUserId: null,
                assignmentGroupId: 'group-n1',
                createdAt: '2026-03-30T10:00:00.000Z',
                id: 'ticket-1',
                number: 'TICK-000001',
                priority: PriorityName.MEDIUM,
                status: TicketStatus.OPEN,
                title: 'Creation de compte',
                type: TicketType.REQUEST,
              },
            ]),
          },
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('returns ticket summaries', async () => {
    await expect(controller.listTickets()).resolves.toEqual([
      expect.objectContaining({
        number: 'TICK-000001',
      }),
    ]);
  });
});
