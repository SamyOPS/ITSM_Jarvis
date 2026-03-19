import { UnauthorizedException } from '@nestjs/common';
import { GetAuthenticatedUserUseCase } from './get-authenticated-user.use-case';
import { UserRole } from '../../../domain/auth/user-role';

describe('GetAuthenticatedUserUseCase', () => {
  it('delegates token validation to the Supabase validator service', async () => {
    const validator = {
      validate: jest.fn().mockResolvedValue({
        accessToken: 'token',
        email: 'user@example.com',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    };

    const useCase = new GetAuthenticatedUserUseCase(validator as never);

    await expect(useCase.execute('token')).resolves.toEqual({
      accessToken: 'token',
      email: 'user@example.com',
      id: 'user-1',
      role: UserRole.AGENT,
    });
    expect(validator.validate).toHaveBeenCalledWith('token');
  });

  it('propagates token validation failures', async () => {
    const validator = {
      validate: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('bad token')),
    };

    const useCase = new GetAuthenticatedUserUseCase(validator as never);

    await expect(useCase.execute('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
