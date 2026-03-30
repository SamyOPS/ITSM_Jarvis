import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCiType } from '../../../domain/referentials/referential-ci-type';
import { ReferentialCiTypeReadRepository } from '../repositories/referential-ci-type-read.repository';

@Injectable()
export class ListCiTypesUseCase {
  constructor(
    @Inject(ReferentialCiTypeReadRepository)
    private readonly ciTypeRepository: ReferentialCiTypeReadRepository,
  ) {}

  async execute(): Promise<ReferentialCiType[]> {
    return this.ciTypeRepository.listCiTypes();
  }
}
