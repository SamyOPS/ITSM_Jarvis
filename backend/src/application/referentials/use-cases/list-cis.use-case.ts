import { Inject, Injectable } from '@nestjs/common';
import { ReferentialCi } from '../../../domain/referentials/referential-ci';
import { ReferentialCiReadRepository } from '../repositories/referential-ci-read.repository';

@Injectable()
export class ListCisUseCase {
  constructor(
    @Inject(ReferentialCiReadRepository)
    private readonly ciRepository: ReferentialCiReadRepository,
  ) {}

  async execute(): Promise<ReferentialCi[]> {
    return this.ciRepository.listCis();
  }
}
