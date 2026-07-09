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
import { assertCanAddBillableUser } from '../user-license-policy';

export type RegisterRequesterCommand = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  password: string;
};

@Injectable()
export class RegisterRequesterUseCase {
  constructor(
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
    @Inject(UserLicenseRepository)
    private readonly userLicenseRepository: UserLicenseRepository,
  ) {}

  async execute(command: RegisterRequesterCommand): Promise<AdminUserSummary> {
    const email = command.email.trim().toLowerCase();
    const password = command.password.trim();

    if (!email) {
      throw new BadRequestException('email is required.');
    }

    if (!email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    assertPasswordMeetsPolicy(password);
    const [users, licenseSettings] = await Promise.all([
      this.adminUserReadRepository.listUsers(),
      this.userLicenseRepository.getSettings(),
    ]);

    assertCanAddBillableUser(users, licenseSettings.maxBillableUsers);

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
