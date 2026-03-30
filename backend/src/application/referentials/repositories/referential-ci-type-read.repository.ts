import { ReferentialCiType } from '../../../domain/referentials/referential-ci-type';

export abstract class ReferentialCiTypeReadRepository {
  abstract listCiTypes(): Promise<ReferentialCiType[]>;
}
