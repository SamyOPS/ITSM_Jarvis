import { ReferentialGroup } from '../../../domain/referentials/referential-group';

export abstract class ReferentialGroupReadRepository {
  abstract listGroups(): Promise<ReferentialGroup[]>;
}
