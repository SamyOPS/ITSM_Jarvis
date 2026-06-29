import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { assertTicketCommentAccess } from '../ticket-comment-access';

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

    const [ticket, userProfile] = await Promise.all([
      this.ticketReadRepository.getTicketById(normalizedTicketId),
      userRole === UserRole.AGENT
        ? this.userAssignmentProfileRepository?.getById(normalizedUserId) ??
          Promise.resolve(null)
        : Promise.resolve(null),
    ]);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketCommentAccess({
      ticket,
      userId: normalizedUserId,
      userProfile,
      userRole,
    });

    return this.ticketCommentReadRepository.listTicketComments({
      includeInternal: userRole !== UserRole.DEMANDEUR,
      ticketId: normalizedTicketId,
    });
  }
}
