import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthPolicy } from '../../../domain/auth/auth-policy';
import { UserRole } from '../../../domain/auth/user-role';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(role: UserRole) {
    return {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            accessToken: 'token',
            email: 'user@example.com',
            id: 'user-1',
            role,
          },
        }),
      }),
    } as never;
  }

  it('allows access when the user role matches', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([UserRole.AGENT])
        .mockReturnValueOnce([]),
    };

    const guard = new RolesGuard(reflector as Reflector);

    expect(guard.canActivate(createContext(UserRole.AGENT))).toBe(true);
  });

  it('denies access when the user role does not match', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([UserRole.ADMIN])
        .mockReturnValueOnce([]),
    };

    const guard = new RolesGuard(reflector as Reflector);

    expect(() => guard.canActivate(createContext(UserRole.USER))).toThrow(
      ForbiddenException,
    );
  });

  it('allows access when the required policy passes', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([AuthPolicy.ACCESS_AGENT_AREA]),
    };

    const guard = new RolesGuard(reflector as Reflector);

    expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
  });

  it('denies access when the required policy fails', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([AuthPolicy.ACCESS_ADMIN_AREA]),
    };

    const guard = new RolesGuard(reflector as Reflector);

    expect(() => guard.canActivate(createContext(UserRole.AGENT))).toThrow(
      ForbiddenException,
    );
  });
});
