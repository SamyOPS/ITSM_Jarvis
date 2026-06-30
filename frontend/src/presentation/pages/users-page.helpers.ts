import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { UserRole } from '../../domain/auth/user-role';
import type {
  ReferentialCatalogSnapshot,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import type {
  UserFormState,
  UserGroupSearchField,
  UserRoleFilter,
  UserSearchField,
} from './users-page.types';

export const USER_ROLES: UserRole[] = ['DEMANDEUR', 'AGENT', 'ADMIN'];
export const USERS_PER_PAGE = 15;
export const USER_GROUPS_PER_PAGE = 5;

export const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
};

export const EMPTY_USER_FORM: UserFormState = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  role: 'DEMANDEUR',
};

export function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

export function filterUsers(
  users: AdminUserSummary[],
  searchText: string,
  searchField: UserSearchField,
  roleFilter: UserRoleFilter,
  showTrash: boolean,
): AdminUserSummary[] {
  const normalizedSearch = normalizeSearchText(searchText);

  return users.filter((user) => {
    if (showTrash ? user.isActive : !user.isActive) {
      return false;
    }

    if (roleFilter !== 'ALL' && user.role !== roleFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const value =
      searchField === 'IDENTIFIER'
        ? formatUserIdentifier(user)
        : searchField === 'FIRST_NAME'
          ? (user.firstName ?? '')
          : (user.lastName ?? '');

    return normalizeSearchText(value).includes(normalizedSearch);
  });
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}

export function getUserGroupIds(user: AdminUserSummary): string[] {
  const groupIds = user.groupIds ?? [];

  if (user.groupId && !groupIds.includes(user.groupId)) {
    return normalizeUserGroupIds([user.groupId, ...groupIds]);
  }

  return normalizeUserGroupIds(groupIds);
}

export function normalizeUserGroupIds(groupIds: string[]): string[] {
  return [...new Set(groupIds.map((groupId) => groupId.trim()))].filter(
    Boolean,
  );
}

export function filterUserLookupGroups(
  groups: ReferentialGroup[],
  searchText: string,
  searchField: UserGroupSearchField,
): ReferentialGroup[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return groups;
  }

  return groups.filter((group) =>
    normalizeSearchText(
      getUserLookupGroupSearchValue(group, searchField),
    ).includes(normalizedSearch),
  );
}

export function getUserLookupGroupSearchValue(
  group: ReferentialGroup,
  searchField: UserGroupSearchField,
): string {
  if (searchField === 'NAME' || searchField === 'IDENTIFIER') {
    return group.name;
  }

  return group.description ?? '';
}

export function inferUserNameParts(user: AdminUserSummary): {
  firstName: string;
  lastName: string;
} {
  if (user.firstName || user.lastName) {
    return {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    };
  }

  const displayName = user.displayName?.trim();

  if (!displayName) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  const [firstName, ...lastNameParts] = displayName.split(/\s+/);

  return {
    firstName: firstName ?? '',
    lastName: lastNameParts.join(' '),
  };
}

export function formatUserIdentifier(user: AdminUserSummary): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.displayName ||
    user.email ||
    user.id
  );
}

export function mapCreateUserErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Erreur inconnue lors de la creation du compte';
  }

  const normalizedMessage = normalizeSearchText(error.message);

  if (
    normalizedMessage.includes('already') &&
    normalizedMessage.includes('registered')
  ) {
    return 'Un compte avec cette adresse email existe deja.';
  }

  if (
    normalizedMessage.includes('already') &&
    normalizedMessage.includes('exists')
  ) {
    return 'Un compte avec cette adresse email existe deja.';
  }

  if (
    normalizedMessage.includes('email') &&
    normalizedMessage.includes('duplicate')
  ) {
    return 'Un compte avec cette adresse email existe deja.';
  }

  return error.message;
}
