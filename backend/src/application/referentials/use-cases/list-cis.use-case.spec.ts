import { ReferentialCi } from '../../../domain/referentials/referential-ci';
import { ListCisUseCase } from './list-cis.use-case';

describe('ListCisUseCase', () => {
  it('lists configuration items from the read repository', async () => {
    const useCase = new ListCisUseCase({
      listCis: jest
        .fn()
        .mockResolvedValue([
          new ReferentialCi(
            'ci-1',
            'Laptop N1',
            'ci-type-1',
            'IN_SERVICE',
            null,
            'ABC-123',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ),
        ]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialCi(
        'ci-1',
        'Laptop N1',
        'ci-type-1',
        'IN_SERVICE',
        null,
        'ABC-123',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ),
    ]);
  });
});
