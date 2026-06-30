import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { resolveAccessibleTicket } from '../ticket-access-resolver';

export type GetTicketByIdCommand = {
  requesterUserId: string;
  requesterUserRole: UserRole;
  ticketId: string;
};

@Injectable()
export class GetTicketByIdUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
  ) {}

  async execute(command: GetTicketByIdCommand): Promise<TicketDetail> {
    const normalizedTicketId = command.ticketId.trim();
    const normalizedRequesterUserId = command.requesterUserId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!normalizedRequesterUserId) {
      throw new BadRequestException('requesterUserId is required.');
    }

    return resolveAccessibleTicket({
      scope: 'detail',
      ticketId: normalizedTicketId,
      ticketReadRepository: this.ticketReadRepository,
      userAssignmentProfileRepository: this.userAssignmentProfileRepository,
      userId: normalizedRequesterUserId,
      userRole: command.requesterUserRole,
    });
  }
}
