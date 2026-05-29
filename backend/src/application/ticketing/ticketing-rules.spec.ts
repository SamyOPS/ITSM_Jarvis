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
        ),
      ).not.toThrow();
    });

    it('rejects reopening a closed ticket', () => {
      expect(() =>
        assertAllowedTicketStatusTransition(
          TicketStatus.CLOSED,
          TicketStatus.IN_PROGRESS,
        ),
      ).toThrow(TicketRuleError);
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

    it('rejects an assigned user without assignment group', () => {
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
      ).toThrow(TicketRuleError);
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
