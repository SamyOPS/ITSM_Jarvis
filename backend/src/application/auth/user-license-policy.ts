import { BadRequestException } from '@nestjs/common';
import { type AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { UserRole } from '../../domain/auth/user-role';

export function assertCanAddBillableUser(
  users: AdminUserSummary[],
  maxBillableUsers: number | null,
): void {
  if (!maxBillableUsers) {
    return;
  }

  if (countBillableActiveUsers(users) >= maxBillableUsers) {
    throw new BadRequestException(
      `User limit reached. Maximum billable users: ${maxBillableUsers}.`,
    );
  }
}

export function isBillableRole(role: UserRole): boolean {
  return role !== UserRole.SUPER_ADMIN;
}

export function isBillableActiveUser(user: AdminUserSummary): boolean {
  return user.isActive && isBillableRole(user.role);
}

export function countBillableActiveUsers(users: AdminUserSummary[]): number {
  return users.filter(isBillableActiveUser).length;
}
