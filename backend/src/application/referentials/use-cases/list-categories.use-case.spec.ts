import { ReferentialCategory } from '../../../domain/referentials/referential-category';
import { ListCategoriesUseCase } from './list-categories.use-case';

describe('ListCategoriesUseCase', () => {
  it('lists categories from the read repository', async () => {
    const useCase = new ListCategoriesUseCase({
      listCategories: jest
        .fn()
        .mockResolvedValue([
          new ReferentialCategory('cat-1', 'Hardware', null),
        ]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialCategory('cat-1', 'Hardware', null),
    ]);
  });
});
