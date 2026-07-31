export type UserAccountStatus = 'ACTIVE' | 'DELETED' | 'TRASHED';

export function getUserAccountStatusLabel(status: UserAccountStatus): string {
  if (status === 'DELETED') {
    return 'Supprime';
  }

  if (status === 'TRASHED') {
    return 'Corbeille';
  }

  return 'Actif';
}
