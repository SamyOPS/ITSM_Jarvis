export type UserAccountStatus = 'ACTIVE' | 'DELETED' | 'TRASHED';

export function resolveUserAccountStatus(
  accountStatus: string | null | undefined,
  isActive: boolean,
): UserAccountStatus {
  if (accountStatus === 'DELETED') {
    return 'DELETED';
  }

  if (accountStatus === 'TRASHED') {
    return 'TRASHED';
  }

  return isActive ? 'ACTIVE' : 'TRASHED';
}
