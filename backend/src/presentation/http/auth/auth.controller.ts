import {
  BadRequestException,
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
  IsInt,
  IsString,
  MinLength,
  Min,
} from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../../../application/auth/password-policy';
import { CreateAdminUserUseCase } from '../../../application/auth/use-cases/create-admin-user.use-case';
import { DeleteAdminUserUseCase } from '../../../application/auth/use-cases/delete-admin-user.use-case';
import {
  GetAuthSetupUseCase,
  type AuthSetupSnapshot,
} from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { GetUserLicenseUseCase } from '../../../application/auth/use-cases/get-user-license.use-case';
import { ListAdminUsersUseCase } from '../../../application/auth/use-cases/list-admin-users.use-case';
import { RegisterRequesterUseCase } from '../../../application/auth/use-cases/register-requester.use-case';
import { UpdateAdminUserUseCase } from '../../../application/auth/use-cases/update-admin-user.use-case';
import { UpdateAdminUserGroupsUseCase } from '../../../application/auth/use-cases/update-admin-user-groups.use-case';
import { UpdateAdminUserStatusUseCase } from '../../../application/auth/use-cases/update-admin-user-status.use-case';
import { UpdateUserLicenseUseCase } from '../../../application/auth/use-cases/update-user-license.use-case';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { AuthPolicy } from '../../../domain/auth/auth-policy';
import { type UserLicenseSnapshot } from '../../../domain/auth/user-license';
import {
  isAdminRole,
  isManagerRole,
  UserRole,
} from '../../../domain/auth/user-role';
import { isBillableRole } from '../../../application/auth/user-license-policy';
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
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: PASSWORD_MIN_LENGTH_MESSAGE,
  })
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

class UpdateUserLicenseDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBillableUsers!: number | null;
}

class UpdateAdminUserGroupsDto {
  @IsArray()
  @IsString({ each: true })
  groupIds!: string[];
}

class RegisterRequesterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: PASSWORD_MIN_LENGTH_MESSAGE,
  })
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly deleteAdminUserUseCase: DeleteAdminUserUseCase,
    private readonly getAuthSetupUseCase: GetAuthSetupUseCase,
    private readonly getAuthenticatedUserUseCase: GetAuthenticatedUserUseCase,
    private readonly getUserLicenseUseCase: GetUserLicenseUseCase,
    private readonly listAdminUsersUseCase: ListAdminUsersUseCase,
    private readonly registerRequesterUseCase: RegisterRequesterUseCase,
    private readonly updateAdminUserUseCase: UpdateAdminUserUseCase,
    private readonly updateAdminUserGroupsUseCase: UpdateAdminUserGroupsUseCase,
    private readonly updateAdminUserStatusUseCase: UpdateAdminUserStatusUseCase,
    private readonly updateUserLicenseUseCase: UpdateUserLicenseUseCase,
  ) {}

  @Get('setup')
  getSetup(): AuthSetupSnapshot {
    return this.getAuthSetupUseCase.execute();
  }

  @Post('register')
  registerRequester(
    @Body() body: RegisterRequesterDto,
  ): Promise<AdminUserSummary> {
    return this.registerRequesterUseCase.execute({
      email: body.email,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      password: body.password,
    });
  }

  @Get('me')
  @UseGuards(BearerAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Get('agent-area')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_AGENT_AREA)
  getAgentArea(@CurrentUser() user: AuthenticatedUser) {
    return {
      area: 'agent',
      role: user.role,
    };
  }

  @Get('admin-area')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  getAdminArea(@CurrentUser() user: AuthenticatedUser) {
    return {
      area: 'admin',
      role: user.role,
    };
  }

  @Get('admin/users')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  async listAdminUsers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminUserSummary[]> {
    const users = await this.listAdminUsersUseCase.execute();

    if (user.role === UserRole.SUPER_ADMIN) {
      return users;
    }

    return users.filter(
      (listedUser) => listedUser.role !== UserRole.SUPER_ADMIN,
    );
  }

  @Get('admin/license')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getUserLicense(): Promise<UserLicenseSnapshot> {
    return this.getUserLicenseUseCase.execute();
  }

  @Patch('admin/license')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateUserLicense(
    @Body() body: UpdateUserLicenseDto,
  ): Promise<UserLicenseSnapshot> {
    return this.updateUserLicenseUseCase.execute({
      maxBillableUsers: body.maxBillableUsers ?? null,
    });
  }

  @Post('admin/users')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  createAdminUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAdminUserDto,
  ): Promise<AdminUserSummary> {
    if (
      body.role === UserRole.SUPER_ADMIN &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Only super admins can create super admins.',
      );
    }

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
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  async updateAdminUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAdminUserDto,
  ): Promise<AdminUserSummary> {
    if (user.id === userId && body.role !== user.role) {
      throw new BadRequestException('You cannot change your own role.');
    }

    const targetUser = await this.assertCanManageTargetUser(user, userId, {
      allowAdminCreation: true,
      action: 'update this account',
      nextRole: body.role,
    });

    if (
      body.role === UserRole.SUPER_ADMIN &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Only super admins can grant the super admin role.',
      );
    }

    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      body.role !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Super admin accounts cannot be downgraded.',
      );
    }

    if (
      targetUser.isActive &&
      targetUser.role === UserRole.SUPER_ADMIN &&
      isBillableRole(body.role)
    ) {
      await this.assertBillableUserSlotAvailable();
    }

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
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  async updateAdminUserStatus(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAdminUserStatusDto,
  ): Promise<AdminUserSummary> {
    if (user.id === userId && !body.isActive) {
      throw new BadRequestException(
        'You cannot move your own account to trash.',
      );
    }

    const targetUser = await this.assertCanManageTargetUser(user, userId, {
      action: body.isActive
        ? 'restore this account'
        : 'move this account to trash',
    });

    if (
      body.isActive &&
      !targetUser.isActive &&
      isBillableRole(targetUser.role)
    ) {
      await this.assertBillableUserSlotAvailable();
    }

    return this.updateAdminUserStatusUseCase.execute(userId, body.isActive);
  }

  @Patch('admin/users/:userId/groups')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  async updateAdminUserGroups(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAdminUserGroupsDto,
  ): Promise<AdminUserSummary> {
    await this.assertCanManageTargetUser(user, userId, {
      action: 'update groups for this account',
      protectManagerPeerGroups: true,
    });

    return this.updateAdminUserGroupsUseCase.execute({
      groupIds: body.groupIds,
      userId,
    });
  }

  @Delete('admin/users/:userId')
  @UseGuards(BearerAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Policies(AuthPolicy.ACCESS_ADMIN_AREA)
  async deleteAdminUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    if (user.id === userId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    await this.assertCanManageTargetUser(user, userId, {
      action: 'delete this account',
    });

    await this.deleteAdminUserUseCase.execute(userId);
  }

  private async assertCanManageTargetUser(
    actor: AuthenticatedUser,
    targetUserId: string,
    options: {
      action: string;
      allowAdminCreation?: boolean;
      nextRole?: UserRole;
      protectManagerPeerGroups?: boolean;
    },
  ): Promise<AdminUserSummary> {
    const targetUser = await this.findAdminUserOrThrow(targetUserId);

    if (actor.role === UserRole.SUPER_ADMIN) {
      return targetUser;
    }

    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'Only super admins can manage super admins.',
      );
    }

    if (
      options.nextRole === UserRole.SUPER_ADMIN ||
      (options.nextRole &&
        !options.allowAdminCreation &&
        isAdminRole(options.nextRole))
    ) {
      throw new BadRequestException('Only super admins can grant this role.');
    }

    if (
      isManagerRole(actor.role) &&
      options.protectManagerPeerGroups &&
      targetUser.role === UserRole.MANAGER
    ) {
      throw new BadRequestException(
        'Managers cannot change groups for other managers.',
      );
    }

    if (
      isManagerRole(actor.role) &&
      options.nextRole &&
      options.nextRole !== targetUser.role &&
      (targetUser.role === UserRole.ADMIN ||
        targetUser.role === UserRole.MANAGER)
    ) {
      throw new BadRequestException(
        'Managers cannot change admin or manager roles.',
      );
    }

    return targetUser;
  }

  private async findAdminUserOrThrow(
    userId: string,
  ): Promise<AdminUserSummary> {
    const users = await this.listAdminUsersUseCase.execute();
    const targetUser = users.find((listedUser) => listedUser.id === userId);

    if (!targetUser) {
      throw new BadRequestException('User account was not found.');
    }

    return targetUser;
  }

  private async assertBillableUserSlotAvailable(): Promise<void> {
    const license = await this.getUserLicenseUseCase.execute();

    if (
      license.maxBillableUsers !== null &&
      license.remainingBillableUsers !== null &&
      license.remainingBillableUsers <= 0
    ) {
      throw new BadRequestException(
        `User limit reached. Maximum billable users: ${license.maxBillableUsers}.`,
      );
    }
  }

  @Get('users')
  @UseGuards(BearerAuthGuard)
  async listUsers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminUserSummary[]> {
    const users = await this.listAdminUsersUseCase.execute();

    if (user.role === UserRole.SUPER_ADMIN) {
      return users;
    }

    return users.filter(
      (listedUser) => listedUser.role !== UserRole.SUPER_ADMIN,
    );
  }
}
