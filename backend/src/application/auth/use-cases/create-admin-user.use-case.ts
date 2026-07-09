import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';
import {
  AdminUserWriteRepository,
  type CreateAdminUserRecord,
} from '../repositories/admin-user-write.repository';
import { AdminUserReadRepository } from '../repositories/admin-user-read.repository';
import { UserLicenseRepository } from '../repositories/user-license.repository';
import { assertPasswordMeetsPolicy } from '../password-policy';
import {
  assertCanAddBillableUser,
  isBillableRole,
} from '../user-license-policy';

export type CreateAdminUserCommand = {
  email: string;
  firstName?: string | null;
  groupId?: string | null;
  groupIds?: string[] | null;
  lastName?: string | null;
  password: string;
  role: UserRole;
};

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
    @Inject(UserLicenseRepository)
    private readonly userLicenseRepository: UserLicenseRepository,
  ) {}

  async execute(command: CreateAdminUserCommand): Promise<AdminUserSummary> {
    const email = command.email.trim().toLowerCase();
    const password = command.password.trim();

    if (!email) {
      throw new BadRequestException('email is required.');
    }

    if (!email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    assertPasswordMeetsPolicy(password);

    if (!Object.values(UserRole).includes(command.role)) {
      throw new BadRequestException('role is invalid.');
    }

    if (isBillableRole(command.role)) {
      const [users, licenseSettings] = await Promise.all([
        this.adminUserReadRepository.listUsers(),
        this.userLicenseRepository.getSettings(),
      ]);

      assertCanAddBillableUser(users, licenseSettings.maxBillableUsers);
    }

    const groupIds = normalizeGroupIds(command.groupIds, command.groupId) ?? [];

    const record: CreateAdminUserRecord = {
      email,
      firstName: normalizeOptionalText(command.firstName),
      groupId: groupIds[0] ?? null,
      groupIds,
      lastName: normalizeOptionalText(command.lastName),
      password,
      role: command.role,
    };

    return this.adminUserWriteRepository.createUser(record);
  }
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeGroupIds(
  groupIds: string[] | null | undefined,
  fallbackGroupId: string | null | undefined,
): string[] | undefined {
  if (groupIds !== undefined && groupIds !== null) {
    return [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))];
  }

  if (fallbackGroupId !== undefined) {
    const groupId = normalizeOptionalText(fallbackGroupId);

    return groupId ? [groupId] : [];
  }

  return undefined;
}
