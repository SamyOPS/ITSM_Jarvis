import { Inject, Injectable } from '@nestjs/common';
import { type Priority } from '../../../domain/references/priority.entity';
import { type PriorityRepository } from '../../../domain/references/priority.repository';
import { PRIORITY_REPOSITORY } from '../../../domain/references/reference-repository.tokens';

@Injectable()
export class ListPrioritiesUseCase {
  constructor(
    @Inject(PRIORITY_REPOSITORY)
    private readonly priorityRepository: PriorityRepository,
  ) {}

  execute(): Promise<readonly Priority[]> {
    return this.priorityRepository.list();
  }
}
