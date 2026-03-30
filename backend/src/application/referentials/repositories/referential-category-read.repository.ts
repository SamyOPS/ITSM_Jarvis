import { ReferentialCategory } from '../../../domain/referentials/referential-category';

export abstract class ReferentialCategoryReadRepository {
  abstract listCategories(): Promise<ReferentialCategory[]>;
}
