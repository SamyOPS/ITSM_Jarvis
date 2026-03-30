import { ReferentialCiType } from '../../../domain/referentials/referential-ci-type';
import { ListCiTypesUseCase } from './list-ci-types.use-case';

describe('ListCiTypesUseCase', () => {
  it('lists CI types from the read repository', async () => {
    const useCase = new ListCiTypesUseCase({
      listCiTypes: jest
        .fn()
        .mockResolvedValue([new ReferentialCiType('ci-type-1', 'LAPTOP')]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialCiType('ci-type-1', 'LAPTOP'),
    ]);
  });
});
