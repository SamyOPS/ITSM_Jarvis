import { Inject, Injectable } from '@nestjs/common';
import { ReferentialChannel } from '../../../domain/referentials/referential-channel';
import { ReferentialChannelReadRepository } from '../repositories/referential-channel-read.repository';

@Injectable()
export class ListChannelsUseCase {
  constructor(
    @Inject(ReferentialChannelReadRepository)
    private readonly channelRepository: ReferentialChannelReadRepository,
  ) {}

  async execute(): Promise<ReferentialChannel[]> {
    return this.channelRepository.listChannels();
  }
}
