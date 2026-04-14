import { Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import { AdminUserReadRepository } from '../repositories/admin-user-read.repository';

@Injectable()
export class ListAdminUsersUseCase {
  constructor(
    @Inject(AdminUserReadRepository)
    private readonly adminUserReadRepository: AdminUserReadRepository,
  ) {}

  execute(): Promise<AdminUserSummary[]> {
    return this.adminUserReadRepository.listUsers();
  }
}
