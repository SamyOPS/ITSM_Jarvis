import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserLicenseSnapshot } from '../../../domain/auth/user-license';
import { AdminUserReadRepository } from '../repositories/admin-user-read.repository';
import { UserLicenseRepository } from '../repositories/user-license.repository';
import { countBillableActiveUsers } from '../user-license-policy';

export type UpdateUserLicenseCommand = {
  maxBillableUsers: number | null;
};

@Injectable()
export class UpdateUserLicenseUseCase {
  constructor(
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
    @Inject(UserLicenseRepository)
    private readonly userLicenseRepository: UserLicenseRepository,
  ) {}

  async execute(
    command: UpdateUserLicenseCommand,
  ): Promise<UserLicenseSnapshot> {
    const maxBillableUsers = normalizeMaxBillableUsers(
      command.maxBillableUsers,
    );
    const users = await this.adminUserReadRepository.listUsers();
    const billableActiveUsers = countBillableActiveUsers(users);

    if (maxBillableUsers !== null && maxBillableUsers < billableActiveUsers) {
      throw new BadRequestException(
        `User limit cannot be lower than current billable users (${billableActiveUsers}).`,
      );
    }

    const settings = await this.userLicenseRepository.updateSettings({
      maxBillableUsers,
    });

    return {
      billableActiveUsers,
      maxBillableUsers: settings.maxBillableUsers,
      remainingBillableUsers:
        settings.maxBillableUsers === null
          ? null
          : settings.maxBillableUsers - billableActiveUsers,
    };
  }
}

function normalizeMaxBillableUsers(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(
      'maxBillableUsers must be a positive integer or null.',
    );
  }

  return value;
}
