import { Test, TestingModule } from '@nestjs/testing';
import { GetAuthSetupUseCase } from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [GetAuthSetupUseCase],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns the current auth setup snapshot', () => {
    const setup = controller.getSetup();

    expect(setup.provider).toBe('supabase');
    expect(setup.roles).toEqual(['USER', 'AGENT', 'ADMIN']);
  });
});
