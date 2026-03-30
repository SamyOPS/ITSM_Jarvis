import { Inject, Injectable } from '@nestjs/common';
import { SUPPORT_GROUP_REPOSITORY } from '../../../domain/references/reference-repository.tokens';
import { type SupportGroup } from '../../../domain/references/support-group.entity';
import { type SupportGroupRepository } from '../../../domain/references/support-group.repository';

@Injectable()
export class ListSupportGroupsUseCase {
  constructor(
    @Inject(SUPPORT_GROUP_REPOSITORY)
    private readonly supportGroupRepository: SupportGroupRepository,
  ) {}

  execute(): Promise<readonly SupportGroup[]> {
    return this.supportGroupRepository.list();
  }
}
