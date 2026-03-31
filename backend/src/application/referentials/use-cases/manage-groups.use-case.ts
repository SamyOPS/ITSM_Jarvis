import { Inject, Injectable } from '@nestjs/common';
import { ReferentialGroup } from '../../../domain/referentials/referential-group';
import { ReferentialGroupWriteRepository } from '../repositories/referential-group-write.repository';
import {
  type CreateReferentialGroupCommand,
  type UpdateReferentialGroupCommand,
} from '../referential-admin.commands';
import {
  assertNonBlank,
  assertSupportLevel,
  assertUuidLike,
  normalizeNullableText,
} from '../referential-admin.validation';

@Injectable()
export class ManageGroupsUseCase {
  constructor(
    @Inject(ReferentialGroupWriteRepository)
    private readonly groupWriteRepository: ReferentialGroupWriteRepository,
  ) {}

  async create(
    command: CreateReferentialGroupCommand,
  ): Promise<ReferentialGroup> {
    return this.groupWriteRepository.createGroup({
      name: assertNonBlank(command.name, 'name'),
      description: normalizeNullableText(command.description),
      level: assertSupportLevel(command.level),
    });
  }

  async update(
    command: UpdateReferentialGroupCommand,
  ): Promise<ReferentialGroup> {
    return this.groupWriteRepository.updateGroup({
      id: assertUuidLike(command.id, 'id'),
      name: assertNonBlank(command.name, 'name'),
      description: normalizeNullableText(command.description),
      level: assertSupportLevel(command.level),
    });
  }

  async delete(id: string): Promise<void> {
    await this.groupWriteRepository.deleteGroup(assertUuidLike(id, 'id'));
  }
}
