import { Controller, Get } from '@nestjs/common';
import {
  GetAuthSetupUseCase,
  type AuthSetupSnapshot,
} from '../../../application/auth/use-cases/get-auth-setup.use-case';

@Controller('auth')
export class AuthController {
  constructor(private readonly getAuthSetupUseCase: GetAuthSetupUseCase) {}

  @Get('setup')
  getSetup(): AuthSetupSnapshot {
    return this.getAuthSetupUseCase.execute();
  }
}
