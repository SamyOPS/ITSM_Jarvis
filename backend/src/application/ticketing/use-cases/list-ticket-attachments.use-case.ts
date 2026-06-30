import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketAttachmentReadRepository } from '../repositories/ticket-attachment-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { resolveAccessibleTicket } from '../ticket-access-resolver';

@Injectable()
export class ListTicketAttachmentsUseCase {
  constructor(
    @Inject(TicketAttachmentReadRepository)
    private readonly ticketAttachmentReadRepository: TicketAttachmentReadRepository,
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Optional()
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
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

    await resolveAccessibleTicket({
      scope: 'attachment',
      ticketId: normalizedTicketId,
      ticketReadRepository: this.ticketReadRepository,
      userAssignmentProfileRepository: this.userAssignmentProfileRepository,
      userId: normalizedUserId,
      userRole,
    });

    return this.ticketAttachmentReadRepository.listTicketAttachments({
      ticketId: normalizedTicketId,
    });
  }
}
