import { Test, TestingModule } from '@nestjs/testing';
import { CreateAdminUserUseCase } from '../../../application/auth/use-cases/create-admin-user.use-case';
import { DeleteAdminUserUseCase } from '../../../application/auth/use-cases/delete-admin-user.use-case';
import { GetAuthenticatedUserUseCase } from '../../../application/auth/use-cases/get-authenticated-user.use-case';
import { GetAuthSetupUseCase } from '../../../application/auth/use-cases/get-auth-setup.use-case';
import { GetUserLicenseUseCase } from '../../../application/auth/use-cases/get-user-license.use-case';
import { ListAdminUsersUseCase } from '../../../application/auth/use-cases/list-admin-users.use-case';
import { RegisterRequesterUseCase } from '../../../application/auth/use-cases/register-requester.use-case';
import { UpdateAdminUserUseCase } from '../../../application/auth/use-cases/update-admin-user.use-case';
import { UpdateAdminUserGroupsUseCase } from '../../../application/auth/use-cases/update-admin-user-groups.use-case';
import { UpdateAdminUserStatusUseCase } from '../../../application/auth/use-cases/update-admin-user-status.use-case';
import { UpdateUserLicenseUseCase } from '../../../application/auth/use-cases/update-user-license.use-case';
import { UpdateUserProfilePhotoUseCase } from '../../../application/auth/use-cases/update-user-profile-photo.use-case';
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
          provide: CreateAdminUserUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetAuthenticatedUserUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetUserLicenseUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              billableActiveUsers: 0,
              maxBillableUsers: null,
              remainingBillableUsers: null,
            }),
          },
        },
        {
          provide: DeleteAdminUserUseCase,
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
        {
          provide: RegisterRequesterUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateAdminUserUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateAdminUserGroupsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateAdminUserStatusUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateUserLicenseUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: UpdateUserProfilePhotoUseCase,
          useValue: {
            delete: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns the current auth setup snapshot', () => {
    const setup = controller.getSetup();

    expect(setup.provider).toBe('supabase');
    expect(setup.roles).toEqual([
      'DEMANDEUR',
      'AGENT',
      'MANAGER',
      'ADMIN',
      'SUPER_ADMIN',
    ]);
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
        email: 'alice@example.com',
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
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      useCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.listAdminUsers({
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual(users);
  });

  it('hides super admin accounts from regular admins', async () => {
    const users = [
      {
        displayName: 'Admin Client',
        email: 'admin@example.com',
        firstName: 'Admin',
        groupId: null,
        id: 'admin-1',
        isActive: true,
        lastName: 'Client',
        role: UserRole.ADMIN,
      },
      {
        displayName: 'Super Admin',
        email: 'super@example.com',
        firstName: 'Super',
        groupId: null,
        id: 'super-1',
        isActive: true,
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      },
    ];
    const useCase = {
      execute: jest.fn().mockResolvedValue(users),
    } as unknown as ListAdminUsersUseCase;

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      useCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.listAdminUsers({
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual([users[0]]);
  });

  it('returns the authenticated users directory', async () => {
    const users = [
      {
        displayName: 'Alice Martin',
        email: 'alice@example.com',
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
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      useCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.listUsers({
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual(users);
  });

  it('keeps deleted accounts in the authenticated users directory for historical labels', async () => {
    const users = [
      {
        accountStatus: 'DELETED',
        displayName: 'Deleted Requester',
        email: 'deleted@example.com',
        firstName: 'Deleted',
        groupId: null,
        id: 'deleted-1',
        isActive: false,
        lastName: 'Requester',
        role: UserRole.DEMANDEUR,
      },
    ];
    const useCase = {
      execute: jest.fn().mockResolvedValue(users),
    } as unknown as ListAdminUsersUseCase;

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      useCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.listUsers({
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual(users);
  });

  it('hides super admin accounts from the authenticated users directory for regular admins', async () => {
    const users = [
      {
        displayName: 'Agent Client',
        email: 'agent@example.com',
        firstName: 'Agent',
        groupId: 'group-1',
        id: 'agent-1',
        isActive: true,
        lastName: 'Client',
        role: UserRole.AGENT,
      },
      {
        displayName: 'Super Admin',
        email: 'super@example.com',
        firstName: 'Super',
        groupId: null,
        id: 'super-1',
        isActive: true,
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      },
    ];
    const useCase = {
      execute: jest.fn().mockResolvedValue(users),
    } as unknown as ListAdminUsersUseCase;

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      useCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.listUsers({
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual([users[0]]);
  });

  it('rejects moving the current admin account to trash', async () => {
    const updateStatus = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn(),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: updateStatus,
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.updateAdminUserStatus(
        'admin-1',
        {
          accessToken: 'token',
          email: 'admin@example.com',
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
        { isActive: false },
      ),
    ).rejects.toThrow('You cannot move your own account to trash.');
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('rejects changing the current admin account role', async () => {
    const updateUser = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn(),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: updateUser,
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.updateAdminUser(
        'admin-1',
        {
          accessToken: 'token',
          email: 'admin@example.com',
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
        {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'Vision',
          role: UserRole.DEMANDEUR,
        },
      ),
    ).rejects.toThrow('You cannot change your own role.');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('lets regular admins update another admin account', async () => {
    const updateUser = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn().mockResolvedValue([
          {
            displayName: 'Second Admin',
            email: 'second-admin@example.com',
            firstName: 'Second',
            groupId: null,
            id: 'admin-2',
            isActive: true,
            lastName: 'Admin',
            role: UserRole.ADMIN,
          },
        ]),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: updateUser,
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await controller.updateAdminUser(
      'admin-2',
      {
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      },
      {
        email: 'second-admin@example.com',
        firstName: 'Second',
        lastName: 'Admin',
        role: UserRole.AGENT,
      },
    );

    expect(updateUser).toHaveBeenCalledWith({
      email: 'second-admin@example.com',
      firstName: 'Second',
      groupId: undefined,
      groupIds: undefined,
      lastName: 'Admin',
      role: UserRole.AGENT,
      userId: 'admin-2',
    });
  });

  it('lets managers update regular user account details', async () => {
    const updateUser = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn().mockResolvedValue([
          {
            displayName: 'Agent Client',
            email: 'agent@example.com',
            firstName: 'Agent',
            groupId: null,
            id: 'agent-1',
            isActive: true,
            lastName: 'Client',
            role: UserRole.AGENT,
          },
        ]),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: updateUser,
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await controller.updateAdminUser(
      'agent-1',
      {
        accessToken: 'token',
        email: 'manager@example.com',
        id: 'manager-1',
        role: UserRole.MANAGER,
      },
      {
        email: 'agent@example.com',
        firstName: 'Agent',
        lastName: 'Client',
        role: UserRole.AGENT,
      },
    );

    expect(updateUser).toHaveBeenCalledWith({
      email: 'agent@example.com',
      firstName: 'Agent',
      groupId: undefined,
      groupIds: undefined,
      lastName: 'Client',
      role: UserRole.AGENT,
      userId: 'agent-1',
    });
  });

  it('rejects manager role changes on admin or manager accounts', async () => {
    const updateUser = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn().mockResolvedValue([
          {
            displayName: 'Admin Client',
            email: 'admin@example.com',
            firstName: 'Admin',
            groupId: null,
            id: 'admin-2',
            isActive: true,
            lastName: 'Client',
            role: UserRole.ADMIN,
          },
        ]),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: updateUser,
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.updateAdminUser(
        'admin-2',
        {
          accessToken: 'token',
          email: 'manager@example.com',
          id: 'manager-1',
          role: UserRole.MANAGER,
        },
        {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'Client',
          role: UserRole.AGENT,
        },
      ),
    ).rejects.toThrow('Managers cannot change admin or manager roles.');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects manager group changes on another manager account', async () => {
    const updateGroups = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn().mockResolvedValue([
          {
            displayName: 'Other Manager',
            email: 'other-manager@example.com',
            firstName: 'Other',
            groupId: null,
            id: 'manager-2',
            isActive: true,
            lastName: 'Manager',
            role: UserRole.MANAGER,
          },
        ]),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: updateGroups,
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.updateAdminUserGroups(
        'manager-2',
        {
          accessToken: 'token',
          email: 'manager@example.com',
          id: 'manager-1',
          role: UserRole.MANAGER,
        },
        { groupIds: ['group-1'] },
      ),
    ).rejects.toThrow('Managers cannot change groups for other managers.');
    expect(updateGroups).not.toHaveBeenCalled();
  });

  it('rejects downgrading another super admin account', async () => {
    const updateUser = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn().mockResolvedValue([
          {
            displayName: 'Second Super Admin',
            email: 'second-super@example.com',
            firstName: 'Second',
            groupId: null,
            id: 'super-2',
            isActive: true,
            lastName: 'Super',
            role: UserRole.SUPER_ADMIN,
          },
        ]),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: updateUser,
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.updateAdminUser(
        'super-2',
        {
          accessToken: 'token',
          email: 'super@example.com',
          id: 'super-1',
          role: UserRole.SUPER_ADMIN,
        },
        {
          email: 'second-super@example.com',
          firstName: 'Second',
          lastName: 'Super',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toThrow('Super admin accounts cannot be downgraded.');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects deleting the current admin account', async () => {
    const deleteUser = jest.fn();

    controller = new AuthController(
      {
        execute: jest.fn(),
      } as unknown as CreateAdminUserUseCase,
      {
        execute: deleteUser,
      } as unknown as DeleteAdminUserUseCase,
      new GetAuthSetupUseCase(),
      {
        execute: jest.fn(),
      } as unknown as GetAuthenticatedUserUseCase,
      mockUserLicenseReadUseCase(),
      {
        execute: jest.fn(),
      } as unknown as ListAdminUsersUseCase,
      {
        execute: jest.fn(),
      } as unknown as RegisterRequesterUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserGroupsUseCase,
      {
        execute: jest.fn(),
      } as unknown as UpdateAdminUserStatusUseCase,
      mockUserLicenseWriteUseCase(),
    );

    await expect(
      controller.deleteAdminUser('admin-1', {
        accessToken: 'token',
        email: 'admin@example.com',
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow('You cannot delete your own account.');
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

function mockUserLicenseReadUseCase(): GetUserLicenseUseCase {
  return {
    execute: jest.fn().mockResolvedValue({
      billableActiveUsers: 0,
      maxBillableUsers: null,
      remainingBillableUsers: null,
    }),
  } as unknown as GetUserLicenseUseCase;
}

function mockUserLicenseWriteUseCase(): UpdateUserLicenseUseCase {
  return {
    execute: jest.fn(),
  } as unknown as UpdateUserLicenseUseCase;
}
