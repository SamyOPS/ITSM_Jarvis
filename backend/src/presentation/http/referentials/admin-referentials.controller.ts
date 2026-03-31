import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ManageCategoriesUseCase } from '../../../application/referentials/use-cases/manage-categories.use-case';
import { ManageChannelsUseCase } from '../../../application/referentials/use-cases/manage-channels.use-case';
import { ManageCisUseCase } from '../../../application/referentials/use-cases/manage-cis.use-case';
import { ManageCiTypesUseCase } from '../../../application/referentials/use-cases/manage-ci-types.use-case';
import { ManageGroupsUseCase } from '../../../application/referentials/use-cases/manage-groups.use-case';
import { ManagePrioritiesUseCase } from '../../../application/referentials/use-cases/manage-priorities.use-case';
import { ManageServicesUseCase } from '../../../application/referentials/use-cases/manage-services.use-case';
import { AuthPolicy } from '../../../domain/auth/auth-policy';
import { UserRole } from '../../../domain/auth/user-role';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { SupportLevel } from '../../../domain/ticketing/support-level';
import { CiStatus } from '../../../domain/ticketing/ci-status';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { Policies } from '../auth/policies.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

type CategoryBody = { name: string; parentId: string | null };
type ChannelBody = { name: string };
type CiTypeBody = { name: string };
type GroupBody = {
  name: string;
  description?: string | null;
  level?: SupportLevel | null;
};
type PriorityBody = {
  name: PriorityName;
  level: number;
  responseHours?: number | null;
  resolutionHours?: number | null;
};
type ServiceBody = {
  name: string;
  description?: string | null;
};
type CiBody = {
  name: string;
  ciTypeId: string;
  status: CiStatus;
  assignedUserId?: string | null;
  serialNumber?: string | null;
};

@Controller('admin/referentials')
@UseGuards(BearerAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Policies(AuthPolicy.MANAGE_REFERENTIALS)
export class AdminReferentialsController {
  constructor(
    private readonly manageCategoriesUseCase: ManageCategoriesUseCase,
    private readonly manageChannelsUseCase: ManageChannelsUseCase,
    private readonly manageCisUseCase: ManageCisUseCase,
    private readonly manageCiTypesUseCase: ManageCiTypesUseCase,
    private readonly manageGroupsUseCase: ManageGroupsUseCase,
    private readonly managePrioritiesUseCase: ManagePrioritiesUseCase,
    private readonly manageServicesUseCase: ManageServicesUseCase,
  ) {}

  @Post('categories')
  createCategory(@Body() body: CategoryBody) {
    return this.manageCategoriesUseCase.create({
      name: body.name,
      parentId: body.parentId ?? null,
    });
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: CategoryBody) {
    return this.manageCategoriesUseCase.update({
      id,
      name: body.name,
      parentId: body.parentId ?? null,
    });
  }

  @Delete('categories/:id')
  @HttpCode(204)
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.manageCategoriesUseCase.delete(id);
  }

  @Post('channels')
  createChannel(@Body() body: ChannelBody) {
    return this.manageChannelsUseCase.create({ name: body.name });
  }

  @Patch('channels/:id')
  updateChannel(@Param('id') id: string, @Body() body: ChannelBody) {
    return this.manageChannelsUseCase.update({ id, name: body.name });
  }

  @Delete('channels/:id')
  @HttpCode(204)
  async deleteChannel(@Param('id') id: string): Promise<void> {
    await this.manageChannelsUseCase.delete(id);
  }

  @Post('ci-types')
  createCiType(@Body() body: CiTypeBody) {
    return this.manageCiTypesUseCase.create({ name: body.name });
  }

  @Patch('ci-types/:id')
  updateCiType(@Param('id') id: string, @Body() body: CiTypeBody) {
    return this.manageCiTypesUseCase.update({ id, name: body.name });
  }

  @Delete('ci-types/:id')
  @HttpCode(204)
  async deleteCiType(@Param('id') id: string): Promise<void> {
    await this.manageCiTypesUseCase.delete(id);
  }

  @Post('groups')
  createGroup(@Body() body: GroupBody) {
    return this.manageGroupsUseCase.create({
      name: body.name,
      description: body.description ?? null,
      level: body.level ?? null,
    });
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() body: GroupBody) {
    return this.manageGroupsUseCase.update({
      id,
      name: body.name,
      description: body.description ?? null,
      level: body.level ?? null,
    });
  }

  @Delete('groups/:id')
  @HttpCode(204)
  async deleteGroup(@Param('id') id: string): Promise<void> {
    await this.manageGroupsUseCase.delete(id);
  }

  @Post('priorities')
  createPriority(@Body() body: PriorityBody) {
    return this.managePrioritiesUseCase.create({
      name: body.name,
      level: body.level,
      responseHours: body.responseHours ?? null,
      resolutionHours: body.resolutionHours ?? null,
    });
  }

  @Patch('priorities/:id')
  updatePriority(@Param('id') id: string, @Body() body: PriorityBody) {
    return this.managePrioritiesUseCase.update({
      id,
      name: body.name,
      level: body.level,
      responseHours: body.responseHours ?? null,
      resolutionHours: body.resolutionHours ?? null,
    });
  }

  @Delete('priorities/:id')
  @HttpCode(204)
  async deletePriority(@Param('id') id: string): Promise<void> {
    await this.managePrioritiesUseCase.delete(id);
  }

  @Post('services')
  createService(@Body() body: ServiceBody) {
    return this.manageServicesUseCase.create({
      name: body.name,
      description: body.description ?? null,
    });
  }

  @Patch('services/:id')
  updateService(@Param('id') id: string, @Body() body: ServiceBody) {
    return this.manageServicesUseCase.update({
      id,
      name: body.name,
      description: body.description ?? null,
    });
  }

  @Delete('services/:id')
  @HttpCode(204)
  async deleteService(@Param('id') id: string): Promise<void> {
    await this.manageServicesUseCase.delete(id);
  }

  @Post('cis')
  createCi(@Body() body: CiBody) {
    return this.manageCisUseCase.create({
      name: body.name,
      ciTypeId: body.ciTypeId,
      status: body.status,
      assignedUserId: body.assignedUserId ?? null,
      serialNumber: body.serialNumber ?? null,
    });
  }

  @Patch('cis/:id')
  updateCi(@Param('id') id: string, @Body() body: CiBody) {
    return this.manageCisUseCase.update({
      id,
      name: body.name,
      ciTypeId: body.ciTypeId,
      status: body.status,
      assignedUserId: body.assignedUserId ?? null,
      serialNumber: body.serialNumber ?? null,
    });
  }

  @Delete('cis/:id')
  @HttpCode(204)
  async deleteCi(@Param('id') id: string): Promise<void> {
    await this.manageCisUseCase.delete(id);
  }
}
