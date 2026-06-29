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
type CiBody = {
  name: string;
  ciTypeId: string;
  status: CiStatus;
  assignedUserId?: string | null;
  serialNumber?: string | null;
  brand?: string | null;
  model?: string | null;
  operatingSystem?: string | null;
  location?: string | null;
  purchaseDate?: string | null;
  warrantyEndDate?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  cpuName?: string | null;
  diskSpaceGb?: number | null;
  ramMb?: number | null;
  keyboardLayout?: string | null;
  osVersion?: string | null;
  price?: number | null;
  comment?: string | null;
  archivedAt?: string | null;
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

  @Post('cis')
  createCi(@Body() body: CiBody) {
    return this.manageCisUseCase.create({
      name: body.name,
      ciTypeId: body.ciTypeId,
      status: body.status,
      assignedUserId: body.assignedUserId ?? null,
      serialNumber: body.serialNumber ?? null,
      brand: body.brand ?? null,
      model: body.model ?? null,
      operatingSystem: body.operatingSystem ?? null,
      location: body.location ?? null,
      purchaseDate: body.purchaseDate ?? null,
      warrantyEndDate: body.warrantyEndDate ?? null,
      ipAddress: body.ipAddress ?? null,
      macAddress: body.macAddress ?? null,
      cpuName: body.cpuName ?? null,
      diskSpaceGb: body.diskSpaceGb ?? null,
      ramMb: body.ramMb ?? null,
      keyboardLayout: body.keyboardLayout ?? null,
      osVersion: body.osVersion ?? null,
      price: body.price ?? null,
      comment: body.comment ?? null,
      archivedAt: body.archivedAt ?? null,
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
      brand: body.brand ?? null,
      model: body.model ?? null,
      operatingSystem: body.operatingSystem ?? null,
      location: body.location ?? null,
      purchaseDate: body.purchaseDate ?? null,
      warrantyEndDate: body.warrantyEndDate ?? null,
      ipAddress: body.ipAddress ?? null,
      macAddress: body.macAddress ?? null,
      cpuName: body.cpuName ?? null,
      diskSpaceGb: body.diskSpaceGb ?? null,
      ramMb: body.ramMb ?? null,
      keyboardLayout: body.keyboardLayout ?? null,
      osVersion: body.osVersion ?? null,
      price: body.price ?? null,
      comment: body.comment ?? null,
      archivedAt: body.archivedAt ?? null,
    });
  }

  @Delete('cis/:id')
  @HttpCode(204)
  async deleteCi(@Param('id') id: string): Promise<void> {
    await this.manageCisUseCase.delete(id);
  }
}
