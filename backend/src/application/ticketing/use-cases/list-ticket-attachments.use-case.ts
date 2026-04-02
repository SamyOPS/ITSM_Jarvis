import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketAttachmentReadRepository } from '../repositories/ticket-attachment-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { assertTicketAttachmentAccess } from '../ticket-attachment-access';

@Injectable()
export class ListTicketAttachmentsUseCase {
  constructor(
    @Inject(TicketAttachmentReadRepository)
    private readonly ticketAttachmentReadRepository: TicketAttachmentReadRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async execute(
    ticketId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<TicketAttachment[]> {
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

    assertTicketAttachmentAccess({
      ticket,
      userId: normalizedUserId,
      userRole,
    });

    return this.ticketAttachmentReadRepository.listTicketAttachments({
      ticketId: normalizedTicketId,
    });
  }
}
