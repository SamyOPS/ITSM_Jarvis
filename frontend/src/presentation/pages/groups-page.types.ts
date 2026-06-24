import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { ReferentialGroup } from '../../domain/referentials/referential-catalog';

export type GroupsPageProps = {
  session: AuthSessionSnapshot;
};

export type GroupFormMode = 'create' | 'edit' | null;
export type GroupSearchField = 'IDENTIFIER' | 'NAME';
export type MemberSearchField =
  | 'EMAIL'
  | 'FIRST_NAME'
  | 'IDENTIFIER'
  | 'LAST_NAME'
  | 'ROLE';

export type GroupFormState = {
  description: string;
  name: string;
};

export type GroupMembershipRoute = ReferentialGroup;
