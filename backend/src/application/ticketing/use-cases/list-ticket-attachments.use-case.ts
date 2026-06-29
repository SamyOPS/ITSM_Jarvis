import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
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

    const [ticket, userProfile] = await Promise.all([
      this.ticketReadRepository.getTicketById(normalizedTicketId),
      userRole === UserRole.AGENT
        ? this.userAssignmentProfileRepository?.getById(normalizedUserId) ??
          Promise.resolve(null)
        : Promise.resolve(null),
    ]);

    if (!ticket) {
      throw new NotFoundException(
        `Ticket ${normalizedTicketId} was not found.`,
      );
    }

    assertTicketAttachmentAccess({
      ticket,
      userId: normalizedUserId,
      userProfile,
      userRole,
    });

    return this.ticketAttachmentReadRepository.listTicketAttachments({
      ticketId: normalizedTicketId,
    });
  }
}
