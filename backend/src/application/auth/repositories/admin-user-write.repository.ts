import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';

export type CreateAdminUserRecord = {
  canManageAssets: boolean;
  canManageKnowledgeBase: boolean;
  canValidateKnowledgeBase: boolean;
  email: string;
  emailConfirmed?: boolean;
  firstName: string | null;
  groupId: string | null;
  groupIds: string[];
  isVip: boolean;
  lastName: string | null;
  password: string;
  role: UserRole;
};

export type UpdateAdminUserRecord = {
  canManageAssets?: boolean;
  canManageKnowledgeBase?: boolean;
  canValidateKnowledgeBase?: boolean;
  email: string;
  firstName: string | null;
  groupId?: string | null;
  groupIds?: string[];
  isVip?: boolean;
  lastName: string | null;
  role: UserRole;
};

export type UpdateUserProfilePhotoRecord = {
  bucketId: string;
  mimeType: string;
  publicUrl: string;
  sizeBytes: number;
  storagePath: string;
};

export abstract class AdminUserWriteRepository {
  abstract createUser(record: CreateAdminUserRecord): Promise<AdminUserSummary>;

  abstract deleteUser(userId: string): Promise<void>;

  abstract updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<AdminUserSummary>;

  abstract updateUserGroups(
    userId: string,
    groupIds: string[],
  ): Promise<AdminUserSummary>;

  abstract updateUser(
    userId: string,
    record: UpdateAdminUserRecord,
  ): Promise<AdminUserSummary>;

  abstract updateUserProfilePhoto(
    userId: string,
    record: UpdateUserProfilePhotoRecord,
  ): Promise<AdminUserSummary>;

  abstract deleteUserProfilePhoto(userId: string): Promise<AdminUserSummary>;
}
