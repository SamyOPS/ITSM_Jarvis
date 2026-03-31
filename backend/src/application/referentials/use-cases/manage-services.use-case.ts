import { Inject, Injectable } from '@nestjs/common';
import { ReferentialService } from '../../../domain/referentials/referential-service';
import { ReferentialServiceWriteRepository } from '../repositories/referential-service-write.repository';
import {
  type CreateReferentialServiceCommand,
  type UpdateReferentialServiceCommand,
} from '../referential-admin.commands';
import {
  assertNonBlank,
  assertUuidLike,
  normalizeNullableText,
} from '../referential-admin.validation';

@Injectable()
export class ManageServicesUseCase {
  constructor(
    @Inject(ReferentialServiceWriteRepository)
    private readonly serviceWriteRepository: ReferentialServiceWriteRepository,
  ) {}

  async create(
    command: CreateReferentialServiceCommand,
  ): Promise<ReferentialService> {
    return this.serviceWriteRepository.createService({
      name: assertNonBlank(command.name, 'name'),
      description: normalizeNullableText(command.description),
    });
  }

  async update(
    command: UpdateReferentialServiceCommand,
  ): Promise<ReferentialService> {
    return this.serviceWriteRepository.updateService({
      id: assertUuidLike(command.id, 'id'),
      name: assertNonBlank(command.name, 'name'),
      description: normalizeNullableText(command.description),
    });
  }

  async delete(id: string): Promise<void> {
    await this.serviceWriteRepository.deleteService(assertUuidLike(id, 'id'));
  }
}
