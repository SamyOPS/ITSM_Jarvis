import { ForbiddenException } from '@nestjs/common';
import { type UserAssignmentProfile } from '../../domain/auth/user-assignment-profile';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';

export function assertTicketDetailAccess(params: {
  ticket: TicketDetail;
  userId: string;
  userProfile?: UserAssignmentProfile | null;
  userRole: UserRole;
}): void {
  assertTicketAccess({
    forbiddenMessage: 'You do not have access to this ticket.',
    ticket: params.ticket,
    userId: params.userId,
    userProfile: params.userProfile,
    userRole: params.userRole,
  });
}

export function assertTicketAccess(params: {
  forbiddenMessage: string;
  ticket: TicketDetail;
  userId: string;
  userProfile?: UserAssignmentProfile | null;
  userRole: UserRole;
}): void {
  if (params.userRole === UserRole.ADMIN) {
    return;
  }

  if (params.userRole === UserRole.AGENT) {
    if (canAgentAccessTicket(params.ticket, params.userId, params.userProfile)) {
      return;
    }

    throw new ForbiddenException(params.forbiddenMessage);
  }

  const canAccess =
    params.ticket.ticket.createdByUserId === params.userId ||
    params.ticket.ticket.requestedForUserId === params.userId;

  if (!canAccess) {
    throw new ForbiddenException(params.forbiddenMessage);
  }
}

function canAgentAccessTicket(
  ticket: TicketDetail,
  userId: string,
  userProfile: UserAssignmentProfile | null | undefined,
): boolean {
  if (ticket.ticket.assignedToUserId) {
    return ticket.ticket.assignedToUserId === userId;
  }

  if (ticket.ticket.assignmentGroupId) {
    const groupIds = new Set([
      ...(userProfile?.groupIds ?? []),
      ...(userProfile?.groupId ? [userProfile.groupId] : []),
    ]);

    return groupIds.has(ticket.ticket.assignmentGroupId);
  }

  return true;
}
