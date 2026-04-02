import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketCommentWriteRepository } from '../repositories/ticket-comment-write.repository';

export type AddTicketCommentCommand = {
  authorRole: UserRole;
  authorUserId: string;
  body: string;
  isInternal?: boolean;
  ticketId: string;
};

@Injectable()
export class AddTicketCommentUseCase {
  constructor(
    @Inject(TicketCommentWriteRepository)
    private readonly ticketCommentWriteRepository: TicketCommentWriteRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async execute(command: AddTicketCommentCommand): Promise<TicketComment> {
    const ticketId = command.ticketId.trim();
    const authorUserId = command.authorUserId.trim();
    const body = command.body.trim();
    const isInternal = command.isInternal ?? false;

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!authorUserId) {
      throw new BadRequestException('authorUserId is required.');
    }

    if (!body) {
      throw new BadRequestException('body is required.');
    }

    if (isInternal && command.authorRole === UserRole.DEMANDEUR) {
      throw new ForbiddenException(
        'Demandeur users cannot create internal comments.',
      );
    }

    const ticket = await this.ticketReadRepository.getTicketById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} was not found.`);
    }

    return this.ticketCommentWriteRepository.addTicketComment({
      authorUserId,
      body,
      isInternal,
      ticketId,
    });
  }
}
