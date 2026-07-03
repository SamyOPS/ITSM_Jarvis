import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { UserRole } from '../../domain/auth/user-role';

export type UsersPageProps = {
  session: AuthSessionSnapshot;
};

export type UserFormState = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
};

export type UserFormMode = 'create' | 'edit' | null;

export type UserSearchField = 'IDENTIFIER' | 'FIRST_NAME' | 'LAST_NAME';

export type UserRoleFilter = UserRole | 'ALL';

export type UserGroupSearchField = 'DESCRIPTION' | 'IDENTIFIER' | 'NAME';

export type UserSortOption =
  | 'CREATED_AT_ASC'
  | 'CREATED_AT_DESC'
  | 'IDENTIFIER_ASC'
  | 'IDENTIFIER_DESC';
