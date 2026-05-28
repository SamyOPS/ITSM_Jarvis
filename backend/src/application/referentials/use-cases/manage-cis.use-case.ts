import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCi } from '../../../domain/referentials/referential-ci';
import { ReferentialCiWriteRepository } from '../repositories/referential-ci-write.repository';
import {
  type CreateReferentialCiCommand,
  type UpdateReferentialCiCommand,
} from '../referential-admin.commands';
import {
  assertCiStatus,
  assertDateOrder,
  assertNullableDate,
  assertNullableDateTime,
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
    const purchaseDate = assertNullableDate(
      command.purchaseDate,
      'purchaseDate',
    );
    const warrantyEndDate = assertNullableDate(
      command.warrantyEndDate,
      'warrantyEndDate',
    );
    assertDateOrder(
      purchaseDate,
      warrantyEndDate,
      'purchaseDate',
      'warrantyEndDate',
    );

    return this.ciWriteRepository.createCi({
      name: assertNonBlank(command.name, 'name'),
      ciTypeId: assertUuidLike(command.ciTypeId, 'ciTypeId'),
      status: assertCiStatus(command.status),
      assignedUserId:
        command.assignedUserId === null
          ? null
          : assertUuidLike(command.assignedUserId, 'assignedUserId'),
      serialNumber: normalizeNullableText(command.serialNumber),
      brand: normalizeNullableText(command.brand),
      model: normalizeNullableText(command.model),
      location: normalizeNullableText(command.location),
      purchaseDate,
      warrantyEndDate,
      ipAddress: normalizeNullableText(command.ipAddress),
      macAddress: normalizeNullableText(command.macAddress),
      comment: normalizeNullableText(command.comment),
      archivedAt: assertNullableDateTime(command.archivedAt, 'archivedAt'),
    });
  }

  async update(command: UpdateReferentialCiCommand): Promise<ReferentialCi> {
    const purchaseDate = assertNullableDate(
      command.purchaseDate,
      'purchaseDate',
    );
    const warrantyEndDate = assertNullableDate(
      command.warrantyEndDate,
      'warrantyEndDate',
    );
    assertDateOrder(
      purchaseDate,
      warrantyEndDate,
      'purchaseDate',
      'warrantyEndDate',
    );

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
      brand: normalizeNullableText(command.brand),
      model: normalizeNullableText(command.model),
      location: normalizeNullableText(command.location),
      purchaseDate,
      warrantyEndDate,
      ipAddress: normalizeNullableText(command.ipAddress),
      macAddress: normalizeNullableText(command.macAddress),
      comment: normalizeNullableText(command.comment),
      archivedAt: assertNullableDateTime(command.archivedAt, 'archivedAt'),
    });
  }

  async delete(id: string): Promise<void> {
    await this.ciWriteRepository.deleteCi(assertUuidLike(id, 'id'));
  }
}
