import { Controller, Get } from '@nestjs/common';
import { GetReferentialCatalogUseCase } from '../../../application/referentials/use-cases/get-referential-catalog.use-case';
import { type ReferentialCatalogSnapshot } from '../../../domain/referentials/referential-catalog';

@Controller('referentials')
export class ReferentialsController {
  constructor(
    private readonly getReferentialCatalogUseCase: GetReferentialCatalogUseCase,
  ) {}

  @Get()
  async getCatalog(): Promise<ReferentialCatalogSnapshot> {
    return this.getReferentialCatalogUseCase.execute();
  }
}
