import { GetReferentialCatalogUseCase } from './get-referential-catalog.use-case';

describe('GetReferentialCatalogUseCase', () => {
  it('returns the full referential catalog', async () => {
    const useCase = new GetReferentialCatalogUseCase({
      listCategories: jest
        .fn()
        .mockResolvedValue([{ id: 'cat-1', name: 'Hardware', parentId: null }]),
      listChannels: jest
        .fn()
        .mockResolvedValue([{ id: 'channel-1', name: 'PORTAL' }]),
      listCiTypes: jest
        .fn()
        .mockResolvedValue([{ id: 'ci-type-1', name: 'LAPTOP' }]),
      listGroups: jest
        .fn()
        .mockResolvedValue([
          { id: 'group-1', name: 'Support N1', description: null, level: 'N1' },
        ]),
      listPriorities: jest.fn().mockResolvedValue([
        {
          id: 'priority-1',
          name: 'LOW',
          level: 1,
          responseHours: 24,
          resolutionHours: 72,
        },
      ]),
      listServices: jest
        .fn()
        .mockResolvedValue([
          { id: 'service-1', name: 'Workstation', description: null },
        ]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual({
      categories: [{ id: 'cat-1', name: 'Hardware', parentId: null }],
      channels: [{ id: 'channel-1', name: 'PORTAL' }],
      ciTypes: [{ id: 'ci-type-1', name: 'LAPTOP' }],
      groups: [
        { id: 'group-1', name: 'Support N1', description: null, level: 'N1' },
      ],
      priorities: [
        {
          id: 'priority-1',
          name: 'LOW',
          level: 1,
          responseHours: 24,
          resolutionHours: 72,
        },
      ],
      services: [{ id: 'service-1', name: 'Workstation', description: null }],
    });
  });
});
