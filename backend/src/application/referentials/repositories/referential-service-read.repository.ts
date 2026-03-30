import { ReferentialService } from '../../../domain/referentials/referential-service';

export abstract class ReferentialServiceReadRepository {
  abstract listServices(): Promise<ReferentialService[]>;
}
