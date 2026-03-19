import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  GetAuthSetupUseCase,
  type AuthSetupSnapshot,
} from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { AuthPolicy } from '../../../domain/auth/auth-policy';
import { UserRole } from '../../../domain/auth/user-role';
import { CurrentUser } from './current-user.decorator';
import { BearerAuthGuard } from './bearer-auth.guard';
import { Policies } from './policies.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly getAuthSetupUseCase: GetAuthSetupUseCase,
    private readonly getAuthenticatedUserUseCase: GetAuthenticatedUserUseCase,
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
}
