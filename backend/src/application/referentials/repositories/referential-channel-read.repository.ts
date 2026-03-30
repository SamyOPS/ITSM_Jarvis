import { ReferentialChannel } from '../../../domain/referentials/referential-channel';

export abstract class ReferentialChannelReadRepository {
  abstract listChannels(): Promise<ReferentialChannel[]>;
}
