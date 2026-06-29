import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { assertTicketDetailAccess } from '../ticket-detail-access';
import { TicketReadRepository } from '../repositories/ticket-read.repository';

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
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository: UserAssignmentProfileRepository,
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

    const [ticket, userProfile] = await Promise.all([
      this.ticketReadRepository.getTicketById(normalizedTicketId),
      command.requesterUserRole === UserRole.AGENT
        ? this.userAssignmentProfileRepository.getById(normalizedRequesterUserId)
        : Promise.resolve(null),
    ]);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketDetailAccess({
      ticket,
      userId: normalizedRequesterUserId,
      userProfile,
      userRole: command.requesterUserRole,
    });

    return ticket;
  }
}
