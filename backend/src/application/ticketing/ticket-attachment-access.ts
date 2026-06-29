import { type UserAssignmentProfile } from '../../domain/auth/user-assignment-profile';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { assertTicketAccess } from './ticket-detail-access';

export function assertTicketAttachmentAccess(params: {
  ticket: TicketDetail;
  userId: string;
  userProfile?: UserAssignmentProfile | null;
  userRole: UserRole;
}): void {
  assertTicketAccess({
    forbiddenMessage: 'You do not have access to attachments for this ticket.',
    ticket: params.ticket,
    userId: params.userId,
    userProfile: params.userProfile,
    userRole: params.userRole,
  });
}
