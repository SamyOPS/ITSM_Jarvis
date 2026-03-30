import { Controller, Get } from '@nestjs/common';
import { ListCategoriesUseCase } from '../../../application/references/use-cases/list-categories.use-case';
import { ListChannelsUseCase } from '../../../application/references/use-cases/list-channels.use-case';
import { ListPrioritiesUseCase } from '../../../application/references/use-cases/list-priorities.use-case';
import { ListServicesUseCase } from '../../../application/references/use-cases/list-services.use-case';
import { ListSupportGroupsUseCase } from '../../../application/references/use-cases/list-support-groups.use-case';
import { type Category } from '../../../domain/references/category.entity';
import { type Channel } from '../../../domain/references/channel.entity';
import { type Priority } from '../../../domain/references/priority.entity';
import { type Service } from '../../../domain/references/service.entity';
import { type SupportGroup } from '../../../domain/references/support-group.entity';

@Controller('references')
export class ReferencesController {
  constructor(
    private readonly listSupportGroupsUseCase: ListSupportGroupsUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly listServicesUseCase: ListServicesUseCase,
    private readonly listChannelsUseCase: ListChannelsUseCase,
    private readonly listPrioritiesUseCase: ListPrioritiesUseCase,
  ) {}

  @Get('groups')
  listGroups(): Promise<readonly SupportGroup[]> {
    return this.listSupportGroupsUseCase.execute();
  }

  @Get('categories')
  listCategories(): Promise<readonly Category[]> {
    return this.listCategoriesUseCase.execute();
  }

  @Get('services')
  listServices(): Promise<readonly Service[]> {
    return this.listServicesUseCase.execute();
  }

  @Get('channels')
  listChannels(): Promise<readonly Channel[]> {
    return this.listChannelsUseCase.execute();
  }

  @Get('priorities')
  listPriorities(): Promise<readonly Priority[]> {
    return this.listPrioritiesUseCase.execute();
  }
}
