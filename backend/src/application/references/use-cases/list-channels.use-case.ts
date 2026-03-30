import { Inject, Injectable } from '@nestjs/common';
import { type Channel } from '../../../domain/references/channel.entity';
import { type ChannelRepository } from '../../../domain/references/channel.repository';
import { CHANNEL_REPOSITORY } from '../../../domain/references/reference-repository.tokens';

@Injectable()
export class ListChannelsUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY)
    private readonly channelRepository: ChannelRepository,
  ) {}

  execute(): Promise<readonly Channel[]> {
    return this.channelRepository.list();
  }
}
