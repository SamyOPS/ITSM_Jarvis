import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AdminUserWriteRepository } from '../repositories/admin-user-write.repository';

@Injectable()
export class DeleteAdminUserUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    await this.adminUserWriteRepository.deleteUser(normalizedUserId);
  }
}
