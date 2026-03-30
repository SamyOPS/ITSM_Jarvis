import { ReferentialGroup } from '../../../domain/referentials/referential-group';
import { SupportLevel } from '../../../domain/ticketing/support-level';
import { ListGroupsUseCase } from './list-groups.use-case';

describe('ListGroupsUseCase', () => {
  it('lists support groups from the read repository', async () => {
    const useCase = new ListGroupsUseCase({
      listGroups: jest
        .fn()
        .mockResolvedValue([
          new ReferentialGroup(
            'group-1',
            'Support N1',
            'Premier niveau',
            SupportLevel.N1,
          ),
        ]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialGroup(
        'group-1',
        'Support N1',
        'Premier niveau',
        SupportLevel.N1,
      ),
    ]);
  });
});
