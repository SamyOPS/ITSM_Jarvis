import { Inject, Injectable } from '@nestjs/common';
import { type Category } from '../../../domain/references/category.entity';
import { type CategoryRepository } from '../../../domain/references/category.repository';
import { CATEGORY_REPOSITORY } from '../../../domain/references/reference-repository.tokens';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  execute(): Promise<readonly Category[]> {
    return this.categoryRepository.list();
  }
}
