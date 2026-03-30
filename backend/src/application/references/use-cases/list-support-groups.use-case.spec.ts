import { ListSupportGroupsUseCase } from './list-support-groups.use-case';
import { SupportLevel } from '../../../domain/ticketing/support-level';

describe('ListSupportGroupsUseCase', () => {
  it('returns the groups from the repository', async () => {
    const repository = {
      list: jest.fn().mockResolvedValue([
        {
          createdAt: '2026-03-30T10:00:00.000Z',
          description: 'N1',
          id: 'group-n1',
          level: SupportLevel.N1,
          name: 'Support N1',
          updatedAt: '2026-03-30T10:00:00.000Z',
        },
      ]),
    };

    const useCase = new ListSupportGroupsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual([
      {
        createdAt: '2026-03-30T10:00:00.000Z',
        description: 'N1',
        id: 'group-n1',
        level: SupportLevel.N1,
        name: 'Support N1',
        updatedAt: '2026-03-30T10:00:00.000Z',
      },
    ]);
  });
});
