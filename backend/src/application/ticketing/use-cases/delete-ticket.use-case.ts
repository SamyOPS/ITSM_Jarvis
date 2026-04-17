import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';

export type DeleteTicketCommand = {
  actorRole: UserRole;
  actorUserId: string;
  ticketId: string;
};

@Injectable()
export class DeleteTicketUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
  ) {}

  async execute(command: DeleteTicketCommand): Promise<void> {
    const ticketId = command.ticketId.trim();
    const actorUserId = command.actorUserId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!actorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    if (command.actorRole !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can delete tickets.');
    }

    const ticket = await this.ticketReadRepository.getTicketById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} was not found.`);
    }

    await this.ticketWriteRepository.deleteTicket(ticketId);
  }
}
