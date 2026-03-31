import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import {
  type CreateReferentialPriorityCommand,
  type UpdateReferentialPriorityCommand,
} from '../referential-admin.commands';

export abstract class ReferentialPriorityWriteRepository {
  abstract createPriority(
    command: CreateReferentialPriorityCommand,
  ): Promise<ReferentialPriority>;

  abstract updatePriority(
    command: UpdateReferentialPriorityCommand,
  ): Promise<ReferentialPriority>;

  abstract deletePriority(id: string): Promise<void>;
}
