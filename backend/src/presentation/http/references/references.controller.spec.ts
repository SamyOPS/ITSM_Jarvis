import { Test, TestingModule } from '@nestjs/testing';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { SupportLevel } from '../../../domain/ticketing/support-level';
import { ListCategoriesUseCase } from '../../../application/references/use-cases/list-categories.use-case';
import { ListChannelsUseCase } from '../../../application/references/use-cases/list-channels.use-case';
import { ListPrioritiesUseCase } from '../../../application/references/use-cases/list-priorities.use-case';
import { ListServicesUseCase } from '../../../application/references/use-cases/list-services.use-case';
import { ListSupportGroupsUseCase } from '../../../application/references/use-cases/list-support-groups.use-case';
import { ReferencesController } from './references.controller';

describe('ReferencesController', () => {
  let controller: ReferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferencesController],
      providers: [
        {
          provide: ListSupportGroupsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue([
              {
                createdAt: '2026-03-30T10:00:00.000Z',
                description: 'N1',
                id: 'group-n1',
                level: SupportLevel.N1,
                name: 'Support N1',
                updatedAt: '2026-03-30T10:00:00.000Z',
              },
            ]),
          },
        },
        {
          provide: ListCategoriesUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ListServicesUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ListChannelsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ListPrioritiesUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue([
              {
                createdAt: '2026-03-30T10:00:00.000Z',
                id: 'priority-medium',
                level: 2,
                name: PriorityName.MEDIUM,
                resolutionHours: 16,
                responseHours: 4,
                updatedAt: '2026-03-30T10:00:00.000Z',
              },
            ]),
          },
        },
      ],
    }).compile();

    controller = module.get<ReferencesController>(ReferencesController);
  });

  it('returns the support groups', async () => {
    await expect(controller.listGroups()).resolves.toHaveLength(1);
  });

  it('returns the priorities', async () => {
    await expect(controller.listPriorities()).resolves.toEqual([
      expect.objectContaining({
        name: PriorityName.MEDIUM,
      }),
    ]);
  });
});
