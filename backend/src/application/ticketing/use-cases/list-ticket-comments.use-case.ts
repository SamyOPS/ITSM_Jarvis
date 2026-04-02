import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';

@Injectable()
export class ListTicketCommentsUseCase {
  constructor(
    @Inject(TicketCommentReadRepository)
    private readonly ticketCommentReadRepository: TicketCommentReadRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async execute(
    ticketId: string,
    userRole: UserRole,
  ): Promise<TicketComment[]> {
    const normalizedTicketId = ticketId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('ticketId is required.');
    }

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    return this.ticketCommentReadRepository.listTicketComments({
      includeInternal: userRole !== UserRole.DEMANDEUR,
      ticketId: normalizedTicketId,
    });
  }
}
