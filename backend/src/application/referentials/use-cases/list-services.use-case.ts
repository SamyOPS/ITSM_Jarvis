import { Inject, Injectable } from '@nestjs/common';
import { ReferentialService } from '../../../domain/referentials/referential-service';
import { ReferentialServiceReadRepository } from '../repositories/referential-service-read.repository';

@Injectable()
export class ListServicesUseCase {
  constructor(
    @Inject(ReferentialServiceReadRepository)
    private readonly serviceRepository: ReferentialServiceReadRepository,
  ) {}

  async execute(): Promise<ReferentialService[]> {
    return this.serviceRepository.listServices();
  }
}
