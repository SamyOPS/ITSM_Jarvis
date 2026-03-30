import { Inject, Injectable } from '@nestjs/common';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { ReferentialPriorityReadRepository } from '../repositories/referential-priority-read.repository';

@Injectable()
export class ListPrioritiesUseCase {
  constructor(
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityRepository: ReferentialPriorityReadRepository,
  ) {}

  async execute(): Promise<ReferentialPriority[]> {
    return this.priorityRepository.listPriorities();
  }
}
