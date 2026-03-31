import { Inject, Injectable } from '@nestjs/common';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { ReferentialPriorityWriteRepository } from '../repositories/referential-priority-write.repository';
import {
  type CreateReferentialPriorityCommand,
  type UpdateReferentialPriorityCommand,
} from '../referential-admin.commands';
import {
  assertNullableNonNegativeInteger,
  assertPositiveInteger,
  assertPriorityName,
  assertSlaOrder,
  assertUuidLike,
} from '../referential-admin.validation';

@Injectable()
export class ManagePrioritiesUseCase {
  constructor(
    @Inject(ReferentialPriorityWriteRepository)
    private readonly priorityWriteRepository: ReferentialPriorityWriteRepository,
  ) {}

  async create(
    command: CreateReferentialPriorityCommand,
  ): Promise<ReferentialPriority> {
    const responseHours = assertNullableNonNegativeInteger(
      command.responseHours,
      'responseHours',
    );
    const resolutionHours = assertNullableNonNegativeInteger(
      command.resolutionHours,
      'resolutionHours',
    );

    assertSlaOrder(responseHours, resolutionHours);

    return this.priorityWriteRepository.createPriority({
      name: assertPriorityName(command.name),
      level: assertPositiveInteger(command.level, 'level'),
      responseHours,
      resolutionHours,
    });
  }

  async update(
    command: UpdateReferentialPriorityCommand,
  ): Promise<ReferentialPriority> {
    const responseHours = assertNullableNonNegativeInteger(
      command.responseHours,
      'responseHours',
    );
    const resolutionHours = assertNullableNonNegativeInteger(
      command.resolutionHours,
      'resolutionHours',
    );

    assertSlaOrder(responseHours, resolutionHours);

    return this.priorityWriteRepository.updatePriority({
      id: assertUuidLike(command.id, 'id'),
      name: assertPriorityName(command.name),
      level: assertPositiveInteger(command.level, 'level'),
      responseHours,
      resolutionHours,
    });
  }

  async delete(id: string): Promise<void> {
    await this.priorityWriteRepository.deletePriority(assertUuidLike(id, 'id'));
  }
}
