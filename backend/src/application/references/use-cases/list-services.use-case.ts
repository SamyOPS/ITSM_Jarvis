import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_REPOSITORY } from '../../../domain/references/reference-repository.tokens';
import { type Service } from '../../../domain/references/service.entity';
import { type ServiceRepository } from '../../../domain/references/service.repository';

@Injectable()
export class ListServicesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  execute(): Promise<readonly Service[]> {
    return this.serviceRepository.list();
  }
}
