import { type Channel } from './channel.entity';

export interface ChannelRepository {
  list(): Promise<readonly Channel[]>;
}
