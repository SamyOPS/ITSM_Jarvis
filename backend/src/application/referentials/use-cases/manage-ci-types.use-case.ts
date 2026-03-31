import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCiType } from '../../../domain/referentials/referential-ci-type';
import { ReferentialCiTypeWriteRepository } from '../repositories/referential-ci-type-write.repository';
import {
  type CreateReferentialCiTypeCommand,
  type UpdateReferentialCiTypeCommand,
} from '../referential-admin.commands';
import {
  assertNonBlank,
  assertUuidLike,
} from '../referential-admin.validation';

@Injectable()
export class ManageCiTypesUseCase {
  constructor(
    @Inject(ReferentialCiTypeWriteRepository)
    private readonly ciTypeWriteRepository: ReferentialCiTypeWriteRepository,
  ) {}

  async create(
    command: CreateReferentialCiTypeCommand,
  ): Promise<ReferentialCiType> {
    return this.ciTypeWriteRepository.createCiType({
      name: assertNonBlank(command.name, 'name').toUpperCase(),
    });
  }

  async update(
    command: UpdateReferentialCiTypeCommand,
  ): Promise<ReferentialCiType> {
    return this.ciTypeWriteRepository.updateCiType({
      id: assertUuidLike(command.id, 'id'),
      name: assertNonBlank(command.name, 'name').toUpperCase(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.ciTypeWriteRepository.deleteCiType(assertUuidLike(id, 'id'));
  }
}
