import { type UserAssignmentProfile } from '../../domain/auth/user-assignment-profile';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { assertTicketAccess } from './ticket-detail-access';

export function assertTicketCommentAccess(params: {
  ticket: TicketDetail;
  userId: string;
  userProfile?: UserAssignmentProfile | null;
  userRole: UserRole;
}): void {
  assertTicketAccess({
    forbiddenMessage: 'You do not have access to comments for this ticket.',
    ticket: params.ticket,
    userId: params.userId,
    userProfile: params.userProfile,
    userRole: params.userRole,
  });
}
