import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryReadRepository } from '../repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { assertTicketCommentAccess } from '../ticket-comment-access';

@Injectable()
export class ListTicketHistoryUseCase {
  constructor(
    @Inject(TicketHistoryReadRepository)
    private readonly ticketHistoryReadRepository: TicketHistoryReadRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository: UserAssignmentProfileRepository,
  ) {}

  async execute(
    ticketId: string,
    requesterUserId: string,
    requesterUserRole: UserRole,
  ): Promise<TicketHistoryEntry[]> {
    const normalizedTicketId = ticketId.trim();
    const normalizedRequesterUserId = requesterUserId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedRequesterUserId) {
      throw new BadRequestException('requesterUserId is required.');
    }

    const [ticket, userProfile] = await Promise.all([
      this.ticketReadRepository.getTicketById(normalizedTicketId),
      requesterUserRole === UserRole.AGENT
        ? this.userAssignmentProfileRepository.getById(
            normalizedRequesterUserId,
          )
        : Promise.resolve(null),
    ]);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketCommentAccess({
      ticket,
      userId: normalizedRequesterUserId,
      userProfile,
      userRole: requesterUserRole,
    });

    return this.ticketHistoryReadRepository.listTicketHistoryEntries({
      ticketIds: [normalizedTicketId],
    });
  }
}
