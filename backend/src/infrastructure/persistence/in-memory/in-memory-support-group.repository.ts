import { Injectable } from '@nestjs/common';
import { type SupportGroupRepository } from '../../../domain/references/support-group.repository';
import { type SupportGroup } from '../../../domain/references/support-group.entity';
import { SUPPORT_GROUP_SEED } from './reference.seed';

@Injectable()
export class InMemorySupportGroupRepository implements SupportGroupRepository {
  list(): Promise<readonly SupportGroup[]> {
    return Promise.resolve(SUPPORT_GROUP_SEED);
  }
}
