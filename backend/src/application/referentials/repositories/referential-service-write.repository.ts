import { ReferentialService } from '../../../domain/referentials/referential-service';
import {
  type CreateReferentialServiceCommand,
  type UpdateReferentialServiceCommand,
} from '../referential-admin.commands';

export abstract class ReferentialServiceWriteRepository {
  abstract createService(
    command: CreateReferentialServiceCommand,
  ): Promise<ReferentialService>;

  abstract updateService(
    command: UpdateReferentialServiceCommand,
  ): Promise<ReferentialService>;

  abstract deleteService(id: string): Promise<void>;
}
