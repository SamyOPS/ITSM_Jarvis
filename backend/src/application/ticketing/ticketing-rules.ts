import {
  isSupportManagerRole,
  isSupportRole,
  UserRole,
} from '../../domain/auth/user-role';
import { TicketRuleError } from '../../domain/ticketing/ticket-rule.error';
import { TicketStatus } from '../../domain/ticketing/ticket-status';

export const MAX_CATEGORY_DEPTH = 2;
export const TICKET_NUMBER_PREFIX = 'TICK-';
export const TICKET_NUMBER_DIGITS = 6;
export const TICKET_NUMBER_PATTERN = /^TICK-\d{6}$/;

const AGENT_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> =
  {
    [TicketStatus.OPEN]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING,
      TicketStatus.RESOLVED,
    ],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.PENDING, TicketStatus.RESOLVED],
    [TicketStatus.PENDING]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
    [TicketStatus.RESOLVED]: [TicketStatus.IN_PROGRESS, TicketStatus.PENDING],
    [TicketStatus.CLOSED]: [TicketStatus.CLOSED],
  };

const REQUESTER_STATUS_TRANSITIONS: Record<
  TicketStatus,
  readonly TicketStatus[]
> = {
  [TicketStatus.OPEN]: [TicketStatus.OPEN],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.PENDING]: [TicketStatus.PENDING],
  [TicketStatus.RESOLVED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [TicketStatus.CLOSED],
};

const ADMIN_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> =
  {
    [TicketStatus.OPEN]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.IN_PROGRESS]: [
      TicketStatus.OPEN,
      TicketStatus.PENDING,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.PENDING]: [
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.RESOLVED]: [
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.CLOSED]: [
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING,
      TicketStatus.RESOLVED,
    ],
  };

export type AssignmentPolicyInput = {
  assignedToUserId: string | null;
  assignmentGroupId: string | null;
  user?: {
    groupId: string | null;
    groupIds?: string[];
    isActive: boolean;
    role: UserRole;
  } | null;
};

export function assertValidTicketNumberFormat(ticketNumber: string): void {
  if (!TICKET_NUMBER_PATTERN.test(ticketNumber)) {
    throw new TicketRuleError(
      `Ticket number must match ${TICKET_NUMBER_PREFIX}${'0'.repeat(TICKET_NUMBER_DIGITS)}.`,
    );
  }
}

export function assertAllowedTicketStatusTransition(
  previousStatus: TicketStatus,
  nextStatus: TicketStatus,
  userRole: UserRole | null | undefined,
): void {
  if (previousStatus === nextStatus) {
    return;
  }

  const transitions = getAllowedStatusTransitionsForRole(userRole);

  if (!transitions[previousStatus].includes(nextStatus)) {
    throw new TicketRuleError(
      `Ticket status transition ${previousStatus} -> ${nextStatus} is not allowed for this role.`,
    );
  }
}

function getAllowedStatusTransitionsForRole(
  userRole: UserRole | null | undefined,
): Record<TicketStatus, readonly TicketStatus[]> {
  if (userRole && isSupportManagerRole(userRole)) {
    return ADMIN_STATUS_TRANSITIONS;
  }

  if (userRole === UserRole.DEMANDEUR) {
    return REQUESTER_STATUS_TRANSITIONS;
  }

  return AGENT_STATUS_TRANSITIONS;
}

export function assertTicketCanBeModifiedByRole(
  status: TicketStatus,
  archivedAt: string | null,
  userRole: UserRole | null | undefined,
): void {
  if (userRole && isSupportManagerRole(userRole)) {
    return;
  }

  if (archivedAt) {
    throw new TicketRuleError(
      'Archived tickets can only be modified by admins.',
    );
  }

  if (status === TicketStatus.CLOSED) {
    throw new TicketRuleError('Closed tickets can only be modified by admins.');
  }
}

export function assertValidAssignmentPolicy({
  assignedToUserId,
  assignmentGroupId,
  user,
}: AssignmentPolicyInput): void {
  if (!assignedToUserId) {
    return;
  }

  if (!user) {
    throw new TicketRuleError('Assigned user must exist.');
  }

  if (!user.isActive) {
    throw new TicketRuleError('Assigned user must be active.');
  }

  if (!isSupportRole(user.role)) {
    throw new TicketRuleError('Assigned user must be AGENT or ADMIN.');
  }

  const userGroupIds = new Set([
    ...(user.groupIds ?? []),
    ...(user.groupId ? [user.groupId] : []),
  ]);

  if (userGroupIds.size === 0) {
    throw new TicketRuleError('Assigned user must belong to a support group.');
  }

  if (assignmentGroupId && !userGroupIds.has(assignmentGroupId)) {
    throw new TicketRuleError(
      'Assigned user must belong to the assignment group.',
    );
  }
}
