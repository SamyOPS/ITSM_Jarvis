import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CreateAdminUserUseCase } from '../../../application/auth/use-cases/create-admin-user.use-case';
import { DeleteAdminUserUseCase } from '../../../application/auth/use-cases/delete-admin-user.use-case';
import {
  GetAuthSetupUseCase,
  type AuthSetupSnapshot,
} from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { ListAdminUsersUseCase } from '../../../application/auth/use-cases/list-admin-users.use-case';
import { UpdateAdminUserUseCase } from '../../../application/auth/use-cases/update-admin-user.use-case';
import { UpdateAdminUserGroupsUseCase } from '../../../application/auth/use-cases/update-admin-user-groups.use-case';
import { UpdateAdminUserStatusUseCase } from '../../../application/auth/use-cases/update-admin-user-status.use-case';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { AuthPolicy } from '../../../domain/auth/auth-policy';
import { UserRole } from '../../../domain/auth/user-role';
import { CurrentUser } from './current-user.decorator';
import { BearerAuthGuard } from './bearer-auth.guard';
import { Policies } from './policies.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  groupId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[] | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

class UpdateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  groupId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[] | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsEnum(UserRole)
  role!: UserRole;
}

class UpdateAdminUserStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

class UpdateAdminUserGroupsDto {
  @IsArray()
  @IsString({ each: true })
  groupIds!: string[];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly deleteAdminUserUseCase: DeleteAdminUserUseCase,
    private readonly getAuthSetupUseCase: GetAuthSetupUseCase,
    private readonly getAuthenticatedUserUseCase: GetAuthenticatedUserUseCase,
    private readonly listAdminUsersUseCase: ListAdminUsersUseCase,
    private readonly updateAdminUserUseCase: UpdateAdminUserUseCase,
    private readonly updateAdminUserGroupsUseCase: UpdateAdminUserGroupsUseCase,
    private readonly updateAdminUserStatusUseCase: UpdateAdminUserStatusUseCase,
  ) {}

  @Get('setup')
  getSetup(): AuthSetupSnapshot {
    return this.getAuthSetupUseCase.execute();
  }

  @Get('me')
  @UseGuards(BearerAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Get('agent-area')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_AGENT_AREA)
  getAgentArea(@CurrentUser() user: AuthenticatedUser) {
    return {
      area: 'agent',
      role: user.role,
    };
  }

  @Get('admin-area')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  getAdminArea(@CurrentUser() user: AuthenticatedUser) {
    return {
      area: 'admin',
      role: user.role,
    };
  }

  @Get('admin/users')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  listAdminUsers(): Promise<AdminUserSummary[]> {
    return this.listAdminUsersUseCase.execute();
  }

  @Post('admin/users')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  createAdminUser(@Body() body: CreateAdminUserDto): Promise<AdminUserSummary> {
    return this.createAdminUserUseCase.execute({
      email: body.email,
      firstName: body.firstName ?? null,
      groupId: body.groupId,
      groupIds: body.groupIds,
      lastName: body.lastName ?? null,
      password: body.password,
      role: body.role,
    });
  }

  @Patch('admin/users/:userId')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  updateAdminUser(
    @Param('userId') userId: string,
    @Body() body: UpdateAdminUserDto,
  ): Promise<AdminUserSummary> {
    return this.updateAdminUserUseCase.execute({
      email: body.email,
      firstName: body.firstName ?? null,
      groupId: body.groupId,
      groupIds: body.groupIds,
      lastName: body.lastName ?? null,
      role: body.role,
      userId,
    });
  }

  @Patch('admin/users/:userId/status')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  updateAdminUserStatus(
    @Param('userId') userId: string,
    @Body() body: UpdateAdminUserStatusDto,
  ): Promise<AdminUserSummary> {
    return this.updateAdminUserStatusUseCase.execute(userId, body.isActive);
  }

  @Patch('admin/users/:userId/groups')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  updateAdminUserGroups(
    @Param('userId') userId: string,
    @Body() body: UpdateAdminUserGroupsDto,
  ): Promise<AdminUserSummary> {
    return this.updateAdminUserGroupsUseCase.execute({
      groupIds: body.groupIds,
      userId,
    });
  }

  @Delete('admin/users/:userId')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  async deleteAdminUser(@Param('userId') userId: string): Promise<void> {
    await this.deleteAdminUserUseCase.execute(userId);
  }

  @Get('users')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_AGENT_AREA)
  listUsers(): Promise<AdminUserSummary[]> {
    return this.listAdminUsersUseCase.execute();
  }
}
