import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCi } from '../../../domain/referentials/referential-ci';
import { ReferentialCiWriteRepository } from '../repositories/referential-ci-write.repository';
import {
  type CreateReferentialCiCommand,
  type UpdateReferentialCiCommand,
} from '../referential-admin.commands';
import {
  assertCiStatus,
  assertNonBlank,
  assertUuidLike,
  normalizeNullableText,
} from '../referential-admin.validation';

@Injectable()
export class ManageCisUseCase {
  constructor(
    @Inject(ReferentialCiWriteRepository)
    private readonly ciWriteRepository: ReferentialCiWriteRepository,
  ) {}

  async create(command: CreateReferentialCiCommand): Promise<ReferentialCi> {
    return this.ciWriteRepository.createCi({
      name: assertNonBlank(command.name, 'name'),
      ciTypeId: assertUuidLike(command.ciTypeId, 'ciTypeId'),
      status: assertCiStatus(command.status),
      assignedUserId:
        command.assignedUserId === null
          ? null
          : assertUuidLike(command.assignedUserId, 'assignedUserId'),
      serialNumber: normalizeNullableText(command.serialNumber),
    });
  }

  async update(command: UpdateReferentialCiCommand): Promise<ReferentialCi> {
    return this.ciWriteRepository.updateCi({
      id: assertUuidLike(command.id, 'id'),
      name: assertNonBlank(command.name, 'name'),
      ciTypeId: assertUuidLike(command.ciTypeId, 'ciTypeId'),
      status: assertCiStatus(command.status),
      assignedUserId:
        command.assignedUserId === null
          ? null
          : assertUuidLike(command.assignedUserId, 'assignedUserId'),
      serialNumber: normalizeNullableText(command.serialNumber),
    });
  }

  async delete(id: string): Promise<void> {
    await this.ciWriteRepository.deleteCi(assertUuidLike(id, 'id'));
  }
}
