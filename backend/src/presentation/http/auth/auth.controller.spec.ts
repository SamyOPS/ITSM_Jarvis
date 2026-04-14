import { Test, TestingModule } from '@nestjs/testing';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { GetAuthSetupUseCase } from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { ListAdminUsersUseCase } from '../../../application/auth/use-cases/list-admin-users.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        GetAuthSetupUseCase,
        {
          provide: GetAuthenticatedUserUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ListAdminUsersUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns the current auth setup snapshot', () => {
    const setup = controller.getSetup();

    expect(setup.provider).toBe('supabase');
    expect(setup.roles).toEqual(['DEMANDEUR', 'AGENT', 'ADMIN']);
  });

  it('returns the authenticated user from the request context', () => {
    expect(
      controller.getCurrentUser({
        accessToken: 'token',
        email: 'agent@example.com',
        firstName: 'Alice',
        id: 'user-1',
        lastName: 'Martin',
        role: UserRole.AGENT,
      }),
    ).toEqual({
      accessToken: 'token',
      email: 'agent@example.com',
      firstName: 'Alice',
      id: 'user-1',
      lastName: 'Martin',
      role: UserRole.AGENT,
    });
  });

  it('returns the agent area payload', () => {
    expect(
      controller.getAgentArea({
        accessToken: 'token',
        email: 'agent@example.com',
        id: 'user-1',
        role: UserRole.AGENT,
      }),
    ).toEqual({
      area: 'agent',
      role: UserRole.AGENT,
    });
  });

  it('returns the admin area payload', () => {
    expect(
      controller.getAdminArea({
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'user-1',
        role: UserRole.ADMIN,
      }),
    ).toEqual({
      area: 'admin',
      role: UserRole.ADMIN,
    });
  });

  it('returns the admin users directory', async () => {
    const users = [
      {
        displayName: 'Alice Martin',
        firstName: 'Alice',
        groupId: 'group-1',
        id: 'user-1',
        isActive: true,
        lastName: 'Martin',
        role: UserRole.ADMIN,
      },
    ];
    const useCase = {
      execute: jest.fn().mockResolvedValue(users),
    } as unknown as ListAdminUsersUseCase;

    controller = new AuthController(
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      useCase,
    );

    await expect(controller.listAdminUsers()).resolves.toEqual(users);
  });

  it('returns the authenticated users directory', async () => {
    const users = [
      {
        displayName: 'Alice Martin',
        firstName: 'Alice',
        groupId: 'group-1',
        id: 'user-1',
        isActive: true,
        lastName: 'Martin',
        role: UserRole.ADMIN,
      },
    ];
    const useCase = {
      execute: jest.fn().mockResolvedValue(users),
    } as unknown as ListAdminUsersUseCase;

    controller = new AuthController(
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      useCase,
    );

    await expect(controller.listUsers()).resolves.toEqual(users);
  });
});
