import { ReferentialCiType } from '../../../domain/referentials/referential-ci-type';
import {
  type CreateReferentialCiTypeCommand,
  type UpdateReferentialCiTypeCommand,
} from '../referential-admin.commands';

export abstract class ReferentialCiTypeWriteRepository {
  abstract createCiType(
    command: CreateReferentialCiTypeCommand,
  ): Promise<ReferentialCiType>;

  abstract updateCiType(
    command: UpdateReferentialCiTypeCommand,
  ): Promise<ReferentialCiType>;

  abstract deleteCiType(id: string): Promise<void>;
}
