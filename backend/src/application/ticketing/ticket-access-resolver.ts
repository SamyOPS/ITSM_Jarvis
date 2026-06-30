import { NotFoundException } from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { assertTicketAttachmentAccess } from './ticket-attachment-access';
import { assertTicketCommentAccess } from './ticket-comment-access';
import { assertTicketDetailAccess } from './ticket-detail-access';
import { TicketReadRepository } from './repositories/ticket-read.repository';

export type TicketAccessScope = 'attachment' | 'comment' | 'detail' | 'history';

export async function resolveAccessibleTicket(params: {
  scope: TicketAccessScope;
  ticketId: string;
  ticketReadRepository: TicketReadRepository;
  userAssignmentProfileRepository?: UserAssignmentProfileRepository;
  userId: string;
  userRole: UserRole;
}): Promise<TicketDetail> {
  const [ticket, userProfile] = await Promise.all([
    params.ticketReadRepository.getTicketById(params.ticketId),
    params.userRole === UserRole.AGENT
      ? (params.userAssignmentProfileRepository?.getById(params.userId) ??
        Promise.resolve(null))
      : Promise.resolve(null),
  ]);

  if (!ticket) {
    throw new NotFoundException(`Ticket ${params.ticketId} was not found.`);
  }

  switch (params.scope) {
    case 'detail':
      assertTicketDetailAccess({
        ticket,
        userId: params.userId,
        userProfile,
        userRole: params.userRole,
      });
      return ticket;
    case 'comment':
    case 'history':
      assertTicketCommentAccess({
        ticket,
        userId: params.userId,
        userProfile,
        userRole: params.userRole,
      });
      return ticket;
    case 'attachment':
      assertTicketAttachmentAccess({
        ticket,
        userId: params.userId,
        userProfile,
        userRole: params.userRole,
      });
      return ticket;
  }
}
