import { type SupportGroup } from './support-group.entity';

export interface SupportGroupRepository {
  list(): Promise<readonly SupportGroup[]>;
}
