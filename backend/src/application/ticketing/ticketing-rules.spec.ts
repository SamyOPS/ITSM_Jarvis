import { UserRole } from '../../domain/auth/user-role';
import { TicketRuleError } from '../../domain/ticketing/ticket-rule.error';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import {
  assertAllowedTicketStatusTransition,
  assertValidAssignmentPolicy,
  assertValidTicketNumberFormat,
} from './ticketing-rules';

describe('ticketing rules', () => {
  describe('assertValidTicketNumberFormat', () => {
    it('accepts a valid V1 ticket number', () => {
      expect(() => assertValidTicketNumberFormat('TICK-000123')).not.toThrow();
    });

    it('rejects an invalid V1 ticket number', () => {
      expect(() => assertValidTicketNumberFormat('INC-123')).toThrow(
        TicketRuleError,
      );
    });
  });

  describe('assertAllowedTicketStatusTransition', () => {
    it('accepts a valid transition', () => {
      expect(() =>
        assertAllowedTicketStatusTransition(
          TicketStatus.OPEN,
          TicketStatus.PENDING,
          UserRole.AGENT,
        ),
      ).not.toThrow();
    });

    it('rejects closing a ticket directly as agent', () => {
      expect(() =>
        assertAllowedTicketStatusTransition(
          TicketStatus.IN_PROGRESS,
          TicketStatus.CLOSED,
          UserRole.AGENT,
        ),
      ).toThrow(TicketRuleError);
    });

    it('allows closing a resolved ticket as requester', () => {
      expect(() =>
        assertAllowedTicketStatusTransition(
          TicketStatus.RESOLVED,
          TicketStatus.CLOSED,
          UserRole.DEMANDEUR,
        ),
      ).not.toThrow();
    });

    it('allows reopening a closed ticket as admin', () => {
      expect(() =>
        assertAllowedTicketStatusTransition(
          TicketStatus.CLOSED,
          TicketStatus.IN_PROGRESS,
          UserRole.ADMIN,
        ),
      ).not.toThrow();
    });
  });

  describe('assertValidAssignmentPolicy', () => {
    it('accepts a group-only assignment', () => {
      expect(() =>
        assertValidAssignmentPolicy({
          assignedToUserId: null,
          assignmentGroupId: 'group-1',
        }),
      ).not.toThrow();
    });

    it('accepts an assigned support user without assignment group', () => {
      expect(() =>
        assertValidAssignmentPolicy({
          assignedToUserId: 'user-1',
          assignmentGroupId: null,
          user: {
            groupId: 'group-1',
            isActive: true,
            role: UserRole.AGENT,
          },
        }),
      ).not.toThrow();
    });

    it('rejects a demandeur assignment', () => {
      expect(() =>
        assertValidAssignmentPolicy({
          assignedToUserId: 'user-1',
          assignmentGroupId: 'group-1',
          user: {
            groupId: 'group-1',
            isActive: true,
            role: UserRole.DEMANDEUR,
          },
        }),
      ).toThrow(TicketRuleError);
    });

    it('rejects a cross-group assignment', () => {
      expect(() =>
        assertValidAssignmentPolicy({
          assignedToUserId: 'user-1',
          assignmentGroupId: 'group-1',
          user: {
            groupId: 'group-2',
            isActive: true,
            role: UserRole.AGENT,
          },
        }),
      ).toThrow(TicketRuleError);
    });

    it('accepts an active agent in the assignment group', () => {
      expect(() =>
        assertValidAssignmentPolicy({
          assignedToUserId: 'user-1',
          assignmentGroupId: 'group-1',
          user: {
            groupId: 'group-1',
            isActive: true,
            role: UserRole.AGENT,
          },
        }),
      ).not.toThrow();
    });

    it('accepts an active agent in a secondary assignment group', () => {
      expect(() =>
        assertValidAssignmentPolicy({
          assignedToUserId: 'user-1',
          assignmentGroupId: 'group-1',
          user: {
            groupId: 'group-2',
            groupIds: ['group-2', 'group-1'],
            isActive: true,
            role: UserRole.AGENT,
          },
        }),
      ).not.toThrow();
    });
  });
});
