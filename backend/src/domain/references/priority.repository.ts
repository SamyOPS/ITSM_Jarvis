import { type Priority } from './priority.entity';

export interface PriorityRepository {
  list(): Promise<readonly Priority[]>;
}
