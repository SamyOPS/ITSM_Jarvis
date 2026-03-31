import { ReferentialCi } from '../../../domain/referentials/referential-ci';
import {
  type CreateReferentialCiCommand,
  type UpdateReferentialCiCommand,
} from '../referential-admin.commands';

export abstract class ReferentialCiWriteRepository {
  abstract createCi(
    command: CreateReferentialCiCommand,
  ): Promise<ReferentialCi>;

  abstract updateCi(
    command: UpdateReferentialCiCommand,
  ): Promise<ReferentialCi>;

  abstract deleteCi(id: string): Promise<void>;
}
