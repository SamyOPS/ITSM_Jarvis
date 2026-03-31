import { Injectable } from '@nestjs/common';
import { type ReferentialCatalogSnapshot } from '../../../domain/referentials/referential-catalog';
import { ListCategoriesUseCase } from './list-categories.use-case';
import { ListChannelsUseCase } from './list-channels.use-case';
import { ListCisUseCase } from './list-cis.use-case';
import { ListCiTypesUseCase } from './list-ci-types.use-case';
import { ListGroupsUseCase } from './list-groups.use-case';
import { ListPrioritiesUseCase } from './list-priorities.use-case';
import { ListServicesUseCase } from './list-services.use-case';

@Injectable()
export class GetReferentialCatalogUseCase {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly listChannelsUseCase: ListChannelsUseCase,
    private readonly listCisUseCase: ListCisUseCase,
    private readonly listCiTypesUseCase: ListCiTypesUseCase,
    private readonly listGroupsUseCase: ListGroupsUseCase,
    private readonly listPrioritiesUseCase: ListPrioritiesUseCase,
    private readonly listServicesUseCase: ListServicesUseCase,
  ) {}

  async execute(): Promise<ReferentialCatalogSnapshot> {
    const [categories, channels, cis, ciTypes, groups, priorities, services] =
      await Promise.all([
        this.listCategoriesUseCase.execute(),
        this.listChannelsUseCase.execute(),
        this.listCisUseCase.execute(),
        this.listCiTypesUseCase.execute(),
        this.listGroupsUseCase.execute(),
        this.listPrioritiesUseCase.execute(),
        this.listServicesUseCase.execute(),
      ]);

    return {
      categories,
      channels,
      cis,
      ciTypes,
      groups,
      priorities,
      services,
    };
  }
}
