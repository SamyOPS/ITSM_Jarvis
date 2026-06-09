import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { UserRole } from '../../../domain/auth/user-role';
import {
  AdminUserWriteRepository,
  type CreateAdminUserRecord,
} from '../repositories/admin-user-write.repository';

export type RegisterRequesterCommand = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  password: string;
};

@Injectable()
export class RegisterRequesterUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  execute(command: RegisterRequesterCommand): Promise<AdminUserSummary> {
    const email = command.email.trim().toLowerCase();
    const password = command.password.trim();

    if (!email) {
      throw new BadRequestException('email is required.');
    }

    if (!email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'password must contain at least 8 characters.',
      );
    }

    const record: CreateAdminUserRecord = {
      email,
      emailConfirmed: false,
      firstName: normalizeOptionalText(command.firstName),
      groupId: null,
      groupIds: [],
      lastName: normalizeOptionalText(command.lastName),
      password,
      role: UserRole.DEMANDEUR,
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
