import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { AdminUserWriteRepository } from '../repositories/admin-user-write.repository';

@Injectable()
export class UpdateAdminUserStatusUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  execute(userId: string, isActive: boolean): Promise<AdminUserSummary> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    return this.adminUserWriteRepository.updateUserStatus(
      normalizedUserId,
      isActive,
    );
  }
}
