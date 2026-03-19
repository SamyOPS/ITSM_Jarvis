import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  GetAuthSetupUseCase,
  type AuthSetupSnapshot,
} from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { BearerAuthGuard } from './bearer-auth.guard';

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
}
