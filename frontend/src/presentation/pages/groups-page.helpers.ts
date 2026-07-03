import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { UserRole } from '../../domain/auth/user-role';
import type { ReferentialGroup } from '../../domain/referentials/referential-catalog';
import type {
  GroupSearchField,
  GroupSortOption,
  MemberSearchField,
} from './groups-page.types';

export function filterGroups(
  groups: ReferentialGroup[],
  searchText: string,
  searchField: GroupSearchField,
): ReferentialGroup[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return groups;
  }

  return groups.filter((group) => {
    const value =
      searchField === 'IDENTIFIER' || searchField === 'NAME' ? group.name : '';

    return normalizeSearchText(value).includes(normalizedSearch);
  });
}

export function sortGroups(
  groups: ReferentialGroup[],
  sortBy: GroupSortOption,
): ReferentialGroup[] {
  return [...groups].sort((leftGroup, rightGroup) => {
    const identifierComparison = compareText(leftGroup.name, rightGroup.name);

    return sortBy === 'IDENTIFIER_DESC'
      ? -identifierComparison
      : identifierComparison;
  });
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}

export function getUserGroupIds(user: AdminUserSummary): string[] {
  const groupIds = user.groupIds ?? [];

  if (user.groupId && !groupIds.includes(user.groupId)) {
    return [user.groupId, ...groupIds];
  }

  return groupIds;
}

export function isUserInGroup(
  user: AdminUserSummary,
  groupId: string,
): boolean {
  return getUserGroupIds(user).includes(groupId);
}

export function matchesMemberSearch(
  user: AdminUserSummary,
  searchText: string,
  searchField: MemberSearchField,
): boolean {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return true;
  }

  return normalizeSearchText(getMemberSearchValue(user, searchField)).includes(
    normalizedSearch,
  );
}

function getMemberSearchValue(
  user: AdminUserSummary,
  searchField: MemberSearchField,
): string {
  if (searchField === 'FIRST_NAME') {
    return user.firstName ?? '';
  }

  if (searchField === 'LAST_NAME') {
    return user.lastName ?? '';
  }

  if (searchField === 'EMAIL') {
    return user.email ?? '';
  }

  if (searchField === 'ROLE') {
    return formatRoleLabel(user.role);
  }

  return formatUserIdentifier(user);
}

export function formatUserIdentifier(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return fullName || user.displayName || user.email || user.id;
}

export function formatRoleLabel(role: UserRole): string {
  return role;
}

function compareText(leftValue: string, rightValue: string): number {
  return leftValue.localeCompare(rightValue, 'fr', {
    numeric: true,
    sensitivity: 'base',
  });
}
