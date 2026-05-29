import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { AdminUserWriteRepository } from '../repositories/admin-user-write.repository';

export type UpdateAdminUserGroupsCommand = {
  groupIds: string[];
  userId: string;
};

@Injectable()
export class UpdateAdminUserGroupsUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  execute(command: UpdateAdminUserGroupsCommand): Promise<AdminUserSummary> {
    const userId = command.userId.trim();

    if (!userId) {
      throw new BadRequestException('userId is required.');
    }

    const groupIds = [
      ...new Set(
        command.groupIds.map((groupId) => groupId.trim()).filter(Boolean),
      ),
    ];

    return this.adminUserWriteRepository.updateUserGroups(userId, groupIds);
  }
}
