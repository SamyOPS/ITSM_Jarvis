import { AuthPolicy } from '../../../domain/auth/auth-policy';
import { UserRole } from '../../../domain/auth/user-role';
import { AdminReferentialsController } from './admin-referentials.controller';

describe('AdminReferentialsController', () => {
  let controller: AdminReferentialsController;
  const manageCategoriesUseCase = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminReferentialsController(
      manageCategoriesUseCase as never,
      { create: jest.fn(), update: jest.fn(), delete: jest.fn() } as never,
      { create: jest.fn(), update: jest.fn(), delete: jest.fn() } as never,
      { create: jest.fn(), update: jest.fn(), delete: jest.fn() } as never,
      { create: jest.fn(), update: jest.fn(), delete: jest.fn() } as never,
      { create: jest.fn(), update: jest.fn(), delete: jest.fn() } as never,
      { create: jest.fn(), update: jest.fn(), delete: jest.fn() } as never,
    );
  });

  it('protects the controller with admin RBAC metadata', () => {
    expect(Reflect.getMetadata('roles', AdminReferentialsController)).toEqual([
      UserRole.ADMIN,
    ]);
    expect(
      Reflect.getMetadata('policies', AdminReferentialsController),
    ).toEqual([AuthPolicy.MANAGE_REFERENTIALS]);
  });

  it('delegates category creation to the use case', async () => {
    const createdCategory = { id: 'cat-1', name: 'Hardware', parentId: null };
    manageCategoriesUseCase.create.mockResolvedValue(createdCategory);

    await expect(
      controller.createCategory({ name: 'Hardware', parentId: null }),
    ).resolves.toEqual(createdCategory);
    expect(manageCategoriesUseCase.create).toHaveBeenCalledWith({
      name: 'Hardware',
      parentId: null,
    });
  });

  it('returns void after deleting a category', async () => {
    manageCategoriesUseCase.delete.mockResolvedValue(undefined);

    await expect(controller.deleteCategory('cat-1')).resolves.toBeUndefined();
    expect(manageCategoriesUseCase.delete).toHaveBeenCalledWith('cat-1');
  });
});
