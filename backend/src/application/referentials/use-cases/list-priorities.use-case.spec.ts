import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { ListPrioritiesUseCase } from './list-priorities.use-case';

describe('ListPrioritiesUseCase', () => {
  it('lists priorities from the read repository', async () => {
    const useCase = new ListPrioritiesUseCase({
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-1', PriorityName.LOW, 1, 24, 72),
        ]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialPriority('priority-1', PriorityName.LOW, 1, 24, 72),
    ]);
  });
});
