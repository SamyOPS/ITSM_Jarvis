import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCategory } from '../../../domain/referentials/referential-category';
import { ReferentialCategoryReadRepository } from '../repositories/referential-category-read.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(ReferentialCategoryReadRepository)
    private readonly categoryRepository: ReferentialCategoryReadRepository,
  ) {}

  async execute(): Promise<ReferentialCategory[]> {
    return this.categoryRepository.listCategories();
  }
}
