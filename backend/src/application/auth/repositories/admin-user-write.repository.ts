import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';

export type CreateAdminUserRecord = {
  email: string;
  firstName: string | null;
  groupId: string | null;
  lastName: string | null;
  password: string;
  role: UserRole;
};

export type UpdateAdminUserRecord = {
  email: string;
  firstName: string | null;
  groupId: string | null;
  lastName: string | null;
  role: UserRole;
};

export abstract class AdminUserWriteRepository {
  abstract createUser(record: CreateAdminUserRecord): Promise<AdminUserSummary>;

  abstract deleteUser(userId: string): Promise<void>;

  abstract updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<AdminUserSummary>;

  abstract updateUser(
    userId: string,
    record: UpdateAdminUserRecord,
  ): Promise<AdminUserSummary>;
}
