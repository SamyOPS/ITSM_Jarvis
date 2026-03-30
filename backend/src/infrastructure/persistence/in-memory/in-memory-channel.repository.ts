import { Injectable } from '@nestjs/common';
import { type Channel } from '../../../domain/references/channel.entity';
import { type ChannelRepository } from '../../../domain/references/channel.repository';
import { CHANNEL_SEED } from './reference.seed';

@Injectable()
export class InMemoryChannelRepository implements ChannelRepository {
  list(): Promise<readonly Channel[]> {
    return Promise.resolve(CHANNEL_SEED);
  }
}
