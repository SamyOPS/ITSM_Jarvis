import { ReferentialPriority } from '../../../domain/referentials/referential-priority';

export abstract class ReferentialPriorityReadRepository {
  abstract listPriorities(): Promise<ReferentialPriority[]>;
}
