import { ReferentialCategory } from '../../../domain/referentials/referential-category';
import {
  type CreateReferentialCategoryCommand,
  type UpdateReferentialCategoryCommand,
} from '../referential-admin.commands';

export abstract class ReferentialCategoryWriteRepository {
  abstract createCategory(
    command: CreateReferentialCategoryCommand,
  ): Promise<ReferentialCategory>;

  abstract updateCategory(
    command: UpdateReferentialCategoryCommand,
  ): Promise<ReferentialCategory>;

  abstract deleteCategory(id: string): Promise<void>;
}
