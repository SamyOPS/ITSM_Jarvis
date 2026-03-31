import { ReferentialChannel } from '../../../domain/referentials/referential-channel';
import {
  type CreateReferentialChannelCommand,
  type UpdateReferentialChannelCommand,
} from '../referential-admin.commands';

export abstract class ReferentialChannelWriteRepository {
  abstract createChannel(
    command: CreateReferentialChannelCommand,
  ): Promise<ReferentialChannel>;

  abstract updateChannel(
    command: UpdateReferentialChannelCommand,
  ): Promise<ReferentialChannel>;

  abstract deleteChannel(id: string): Promise<void>;
}
