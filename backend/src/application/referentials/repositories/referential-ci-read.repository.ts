import { ReferentialCi } from '../../../domain/referentials/referential-ci';

export abstract class ReferentialCiReadRepository {
  abstract listCis(): Promise<ReferentialCi[]>;
}
