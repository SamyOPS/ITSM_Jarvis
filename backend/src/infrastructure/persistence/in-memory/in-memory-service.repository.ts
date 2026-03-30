import { Injectable } from '@nestjs/common';
import { type Service } from '../../../domain/references/service.entity';
import { type ServiceRepository } from '../../../domain/references/service.repository';
import { SERVICE_SEED } from './reference.seed';

@Injectable()
export class InMemoryServiceRepository implements ServiceRepository {
  list(): Promise<readonly Service[]> {
    return Promise.resolve(SERVICE_SEED);
  }
}
