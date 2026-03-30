import { Injectable } from '@nestjs/common';
import { type Priority } from '../../../domain/references/priority.entity';
import { type PriorityRepository } from '../../../domain/references/priority.repository';
import { PRIORITY_SEED } from './reference.seed';

@Injectable()
export class InMemoryPriorityRepository implements PriorityRepository {
  list(): Promise<readonly Priority[]> {
    return Promise.resolve(PRIORITY_SEED);
  }
}
