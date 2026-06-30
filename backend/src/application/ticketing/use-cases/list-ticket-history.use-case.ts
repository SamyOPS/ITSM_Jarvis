import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketHistoryEntry } from '../../../domain/ticketing/ticket-history-entry';
import { TicketHistoryReadRepository } from '../repositories/ticket-history-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { resolveAccessibleTicket } from '../ticket-access-resolver';

@Injectable()
export class ListTicketHistoryUseCase {
  constructor(
    @Inject(TicketHistoryReadRepository)
    private readonly ticketHistoryReadRepository: TicketHistoryReadRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
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

    await resolveAccessibleTicket({
      scope: 'history',
      ticketId: normalizedTicketId,
      ticketReadRepository: this.ticketReadRepository,
      userAssignmentProfileRepository: this.userAssignmentProfileRepository,
      userId: normalizedRequesterUserId,
      userRole: requesterUserRole,
    });

    return this.ticketHistoryReadRepository.listTicketHistoryEntries({
      ticketIds: [normalizedTicketId],
    });
  }
}
