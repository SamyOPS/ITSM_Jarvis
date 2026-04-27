import { UserRole } from '../../domain/auth/user-role';
import { TicketRuleError } from '../../domain/ticketing/ticket-rule.error';
import { TicketStatus } from '../../domain/ticketing/ticket-status';

export const MAX_CATEGORY_DEPTH = 2;
export const TICKET_NUMBER_PREFIX = 'TICK-';
export const TICKET_NUMBER_DIGITS = 6;
export const TICKET_NUMBER_PATTERN = /^TICK-\d{6}$/;

const ALLOWED_STATUS_TRANSITIONS: Record<
  TicketStatus,
  readonly TicketStatus[]
> = {
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.PENDING,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.PENDING,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.PENDING]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.RESOLVED]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.PENDING,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.CLOSED]: [TicketStatus.CLOSED],
};

export type AssignmentPolicyInput = {
  assignedToUserId: string | null;
  assignmentGroupId: string | null;
  user?: {
    groupId: string | null;
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
): void {
  if (previousStatus === nextStatus) {
    return;
  }

  if (!ALLOWED_STATUS_TRANSITIONS[previousStatus].includes(nextStatus)) {
    throw new TicketRuleError(
      `Ticket status transition ${previousStatus} -> ${nextStatus} is not allowed in V1.`,
    );
  }
}

export function assertTicketCanBeModifiedByRole(
  status: TicketStatus,
  archivedAt: string | null,
  userRole: UserRole | null | undefined,
): void {
  if (userRole === UserRole.ADMIN) {
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

  if (!assignmentGroupId) {
    throw new TicketRuleError(
      'assignmentGroupId is required when assignedToUserId is set.',
    );
  }

  if (!user) {
    throw new TicketRuleError('Assigned user must exist.');
  }

  if (!user.isActive) {
    throw new TicketRuleError('Assigned user must be active.');
  }

  if (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN) {
    throw new TicketRuleError('Assigned user must be AGENT or ADMIN.');
  }

  if (!user.groupId) {
    throw new TicketRuleError('Assigned user must belong to a support group.');
  }

  if (user.groupId != assignmentGroupId) {
    throw new TicketRuleError(
      'Assigned user must belong to the assignment group.',
    );
  }
}
