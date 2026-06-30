import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { resolveAccessibleTicket } from '../ticket-access-resolver';

@Injectable()
export class ListTicketCommentsUseCase {
  constructor(
    @Inject(TicketCommentReadRepository)
    private readonly ticketCommentReadRepository: TicketCommentReadRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
  ) {}

  async execute(
    ticketId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<TicketComment[]> {
    const normalizedTicketId = ticketId.trim();
    const normalizedUserId = userId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    await resolveAccessibleTicket({
      scope: 'comment',
      ticketId: normalizedTicketId,
      ticketReadRepository: this.ticketReadRepository,
      userAssignmentProfileRepository: this.userAssignmentProfileRepository,
      userId: normalizedUserId,
      userRole,
    });

    return this.ticketCommentReadRepository.listTicketComments({
      includeInternal: userRole !== UserRole.DEMANDEUR,
      ticketId: normalizedTicketId,
    });
  }
}
