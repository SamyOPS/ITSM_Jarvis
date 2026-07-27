import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetReferentialCatalogUseCase } from '../../../application/referentials/use-cases/get-referential-catalog.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { type ReferentialCatalogSnapshot } from '../../../domain/referentials/referential-catalog';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('referentials')
@UseGuards(BearerAuthGuard, RolesGuard)
@Roles(UserRole.DEMANDEUR, UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN)
export class ReferentialsController {
  constructor(
    private readonly getReferentialCatalogUseCase: GetReferentialCatalogUseCase,
  ) {}

  @Get()
  async getCatalog(): Promise<ReferentialCatalogSnapshot> {
    return this.getReferentialCatalogUseCase.execute();
  }
}
