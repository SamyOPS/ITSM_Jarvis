import { type AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { UserRole } from '../../domain/auth/user-role';
import { assertCanAddBillableUser } from './user-license-policy';

describe('user-license-policy', () => {
  it('does not count super admin users toward the billable user limit', () => {
    expect(() =>
      assertCanAddBillableUser(
        [buildUser('super-1', UserRole.SUPER_ADMIN, true)],
        1,
      ),
    ).not.toThrow();
  });

  it('rejects adding a billable user when the active billable limit is reached', () => {
    expect(() =>
      assertCanAddBillableUser(
        [
          buildUser('agent-1', UserRole.AGENT, true),
          buildUser('super-1', UserRole.SUPER_ADMIN, true),
        ],
        1,
      ),
    ).toThrow('User limit reached. Maximum billable users: 1.');
  });

  it('ignores inactive users when checking the billable user limit', () => {
    expect(() =>
      assertCanAddBillableUser(
        [buildUser('agent-1', UserRole.AGENT, false)],
        1,
      ),
    ).not.toThrow();
  });

  it('allows adding billable users when no limit is configured', () => {
    expect(() =>
      assertCanAddBillableUser(
        [
          buildUser('agent-1', UserRole.AGENT, true),
          buildUser('agent-2', UserRole.AGENT, true),
        ],
        null,
      ),
    ).not.toThrow();
  });
});

function buildUser(
  id: string,
  role: UserRole,
  isActive: boolean,
): AdminUserSummary {
  return {
    displayName: id,
    email: `${id}@example.test`,
    firstName: null,
    groupId: null,
    groupIds: [],
    id,
    isActive,
    lastName: null,
    role,
  };
}
