import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCategory } from '../../../domain/referentials/referential-category';
import { ReferentialCategoryWriteRepository } from '../repositories/referential-category-write.repository';
import {
  type CreateReferentialCategoryCommand,
  type UpdateReferentialCategoryCommand,
} from '../referential-admin.commands';
import {
  assertNonBlank,
  assertUuidLike,
} from '../referential-admin.validation';

@Injectable()
export class ManageCategoriesUseCase {
  constructor(
    @Inject(ReferentialCategoryWriteRepository)
    private readonly categoryWriteRepository: ReferentialCategoryWriteRepository,
  ) {}

  async create(
    command: CreateReferentialCategoryCommand,
  ): Promise<ReferentialCategory> {
    return this.categoryWriteRepository.createCategory({
      name: assertNonBlank(command.name, 'name'),
      parentId:
        command.parentId === null
          ? null
          : assertUuidLike(command.parentId, 'parentId'),
    });
  }

  async update(
    command: UpdateReferentialCategoryCommand,
  ): Promise<ReferentialCategory> {
    return this.categoryWriteRepository.updateCategory({
      id: assertUuidLike(command.id, 'id'),
      name: assertNonBlank(command.name, 'name'),
      parentId:
        command.parentId === null
          ? null
          : assertUuidLike(command.parentId, 'parentId'),
    });
  }

  async delete(id: string): Promise<void> {
    await this.categoryWriteRepository.deleteCategory(assertUuidLike(id, 'id'));
  }
}
