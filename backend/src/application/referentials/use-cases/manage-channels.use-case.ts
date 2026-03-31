import { Inject, Injectable } from '@nestjs/common';
import { ReferentialChannel } from '../../../domain/referentials/referential-channel';
import { ReferentialChannelWriteRepository } from '../repositories/referential-channel-write.repository';
import {
  type CreateReferentialChannelCommand,
  type UpdateReferentialChannelCommand,
} from '../referential-admin.commands';
import {
  assertNonBlank,
  assertUuidLike,
} from '../referential-admin.validation';

@Injectable()
export class ManageChannelsUseCase {
  constructor(
    @Inject(ReferentialChannelWriteRepository)
    private readonly channelWriteRepository: ReferentialChannelWriteRepository,
  ) {}

  async create(
    command: CreateReferentialChannelCommand,
  ): Promise<ReferentialChannel> {
    return this.channelWriteRepository.createChannel({
      name: assertNonBlank(command.name, 'name').toUpperCase(),
    });
  }

  async update(
    command: UpdateReferentialChannelCommand,
  ): Promise<ReferentialChannel> {
    return this.channelWriteRepository.updateChannel({
      id: assertUuidLike(command.id, 'id'),
      name: assertNonBlank(command.name, 'name').toUpperCase(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.channelWriteRepository.deleteChannel(assertUuidLike(id, 'id'));
  }
}
