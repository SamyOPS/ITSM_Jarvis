import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';
import {
  AdminUserWriteRepository,
  type UpdateAdminUserRecord,
} from '../repositories/admin-user-write.repository';

export type UpdateAdminUserCommand = {
  email: string;
  firstName?: string | null;
  groupId?: string | null;
  groupIds?: string[] | null;
  lastName?: string | null;
  role: UserRole;
  userId: string;
};

@Injectable()
export class UpdateAdminUserUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  execute(command: UpdateAdminUserCommand): Promise<AdminUserSummary> {
    const userId = command.userId.trim();
    const email = command.email.trim().toLowerCase();

    if (!userId) {
      throw new BadRequestException('userId is required.');
    }

    if (!email) {
      throw new BadRequestException('email is required.');
    }

    if (!email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    if (!Object.values(UserRole).includes(command.role)) {
      throw new BadRequestException('role is invalid.');
    }

    const groupIds = normalizeGroupIds(command.groupIds, command.groupId);

    const record: UpdateAdminUserRecord = {
      email,
      firstName: normalizeOptionalText(command.firstName),
      lastName: normalizeOptionalText(command.lastName),
      role: command.role,
    };

    if (groupIds !== undefined) {
      record.groupId = groupIds[0] ?? null;
      record.groupIds = groupIds;
    }

    return this.adminUserWriteRepository.updateUser(userId, record);
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
