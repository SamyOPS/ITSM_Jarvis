import { type Service } from './service.entity';

export interface ServiceRepository {
  list(): Promise<readonly Service[]>;
}
