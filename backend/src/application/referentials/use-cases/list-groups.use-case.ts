import { Inject, Injectable } from '@nestjs/common';
import { ReferentialGroup } from '../../../domain/referentials/referential-group';
import { ReferentialGroupReadRepository } from '../repositories/referential-group-read.repository';

@Injectable()
export class ListGroupsUseCase {
  constructor(
    @Inject(ReferentialGroupReadRepository)
    private readonly groupRepository: ReferentialGroupReadRepository,
  ) {}

  async execute(): Promise<ReferentialGroup[]> {
    return this.groupRepository.listGroups();
  }
}
