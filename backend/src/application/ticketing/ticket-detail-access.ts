import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';

export function assertTicketDetailAccess(params: {
  ticket: TicketDetail;
  userId: string;
  userRole: UserRole;
}): void {
  if (
    params.userRole === UserRole.AGENT ||
    params.userRole === UserRole.ADMIN
  ) {
    return;
  }

  const canAccess =
    params.ticket.ticket.createdByUserId === params.userId ||
    params.ticket.ticket.requestedForUserId === params.userId;

  if (!canAccess) {
    throw new ForbiddenException('You do not have access to this ticket.');
  }
}
