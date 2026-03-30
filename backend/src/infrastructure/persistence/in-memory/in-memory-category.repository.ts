import { Injectable } from '@nestjs/common';
import { type Category } from '../../../domain/references/category.entity';
import { type CategoryRepository } from '../../../domain/references/category.repository';
import { CATEGORY_SEED } from './reference.seed';

@Injectable()
export class InMemoryCategoryRepository implements CategoryRepository {
  list(): Promise<readonly Category[]> {
    return Promise.resolve(CATEGORY_SEED);
  }
}
