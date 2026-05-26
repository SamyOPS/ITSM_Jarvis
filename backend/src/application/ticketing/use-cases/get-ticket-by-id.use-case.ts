import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketDetailAccess({
      ticket,
      userId: normalizedRequesterUserId,
      userRole: command.requesterUserRole,
    });

    return ticket;
  }
}
