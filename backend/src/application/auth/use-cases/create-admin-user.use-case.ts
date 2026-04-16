import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';
import {
  AdminUserWriteRepository,
  type CreateAdminUserRecord,
} from '../repositories/admin-user-write.repository';

export type CreateAdminUserCommand = {
  email: string;
  firstName?: string | null;
  groupId?: string | null;
  lastName?: string | null;
  password: string;
  role: UserRole;
};

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  execute(command: CreateAdminUserCommand): Promise<AdminUserSummary> {
    const email = command.email.trim().toLowerCase();
    const password = command.password.trim();

    if (!email) {
      throw new BadRequestException('email is required.');
    }

    if (!email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    if (password.length < 6) {
      throw new BadRequestException(
        'password must contain at least 6 characters.',
      );
    }

    if (!Object.values(UserRole).includes(command.role)) {
      throw new BadRequestException('role is invalid.');
    }

    const record: CreateAdminUserRecord = {
      email,
      firstName: normalizeOptionalText(command.firstName),
      groupId: normalizeOptionalText(command.groupId),
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
