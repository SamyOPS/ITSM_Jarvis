import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const ticket =
      await this.ticketReadRepository.getTicketById(normalizedTicketId);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketCommentAccess({
      ticket,
      userId: normalizedUserId,
      userRole,
    });

    return this.ticketCommentReadRepository.listTicketComments({
      includeInternal: userRole !== UserRole.DEMANDEUR,
      ticketId: normalizedTicketId,
    });
  }
}
