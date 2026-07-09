import { Inject, Injectable } from '@nestjs/common';
import { UserLicenseSnapshot } from '../../../domain/auth/user-license';
import { AdminUserReadRepository } from '../repositories/admin-user-read.repository';
import { UserLicenseRepository } from '../repositories/user-license.repository';
import { countBillableActiveUsers } from '../user-license-policy';

@Injectable()
export class GetUserLicenseUseCase {
  constructor(
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
    @Inject(UserLicenseRepository)
    private readonly userLicenseRepository: UserLicenseRepository,
  ) {}

  async execute(): Promise<UserLicenseSnapshot> {
    const [users, settings] = await Promise.all([
      this.adminUserReadRepository.listUsers(),
      this.userLicenseRepository.getSettings(),
    ]);
    const billableActiveUsers = countBillableActiveUsers(users);

    return {
      billableActiveUsers,
      maxBillableUsers: settings.maxBillableUsers,
      remainingBillableUsers:
        settings.maxBillableUsers === null
          ? null
          : Math.max(settings.maxBillableUsers - billableActiveUsers, 0),
    };
  }
}
