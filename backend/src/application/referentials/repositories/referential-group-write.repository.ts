import { ReferentialGroup } from '../../../domain/referentials/referential-group';
import {
  type CreateReferentialGroupCommand,
  type UpdateReferentialGroupCommand,
} from '../referential-admin.commands';

export abstract class ReferentialGroupWriteRepository {
  abstract createGroup(
    command: CreateReferentialGroupCommand,
  ): Promise<ReferentialGroup>;

  abstract updateGroup(
    command: UpdateReferentialGroupCommand,
  ): Promise<ReferentialGroup>;

  abstract deleteGroup(id: string): Promise<void>;
}
