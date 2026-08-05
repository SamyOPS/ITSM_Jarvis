import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { RequestType } from '../../../domain/ticketing/request-type';
import { ReferentialChannelReadRepository } from '../../referentials/repositories/referential-channel-read.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { resolveCreationChannelId } from '../creation-channel';
import {
  CreateRequestRecord,
  TicketWriteRepository,
} from '../repositories/ticket-write.repository';
import { calculateSlaTargets } from '../sla-targets';
import { isTicketRequesterVip } from '../ticket-requester-vip';

export type CreateRequestCommand = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  creatorRole: UserRole;
  createdByUserId: string;
  description: string;
  priorityId: string;
  requestedForUserId?: string | null;
  requestType?: RequestType | null;
  title: string;
};

@Injectable()
export class CreateRequestUseCase {
  constructor(
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
    @Inject(ReferentialChannelReadRepository)
    private readonly channelRepository: ReferentialChannelReadRepository,
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityRepository: ReferentialPriorityReadRepository,
    private readonly ticketAuditService: TicketAuditService,
    @Inject(UserAssignmentProfileRepository)
    private readonly userAssignmentProfileRepository?: UserAssignmentProfileRepository,
  ) {}

  async execute(command: CreateRequestCommand): Promise<CreatedRequest> {
    const title = command.title.trim();
    const description = command.description.trim();
    const categoryId = command.categoryId.trim();
    const priorityId = command.priorityId.trim();
    const createdByUserId = command.createdByUserId.trim();

    if (!title) {
      throw new BadRequestException('title is required.');
    }

    if (!description) {
      throw new BadRequestException('description is required.');
    }

    if (!categoryId) {
      throw new BadRequestException('categoryId is required.');
    }

    if (!priorityId) {
      throw new BadRequestException('priorityId is required.');
    }

    if (!createdByUserId) {
      throw new BadRequestException('createdByUserId is required.');
    }

    const priorities = await this.priorityRepository.listPriorities();
    const resolvedPriority = priorities.find(
      (priority) => priority.id === priorityId,
    );

    if (!resolvedPriority) {
      throw new BadRequestException(
        `Priority ${priorityId} is not configured in referentials.`,
      );
    }

    const requestedForUserId = normalizeOptionalId(command.requestedForUserId);
    const isRequesterVip = await isTicketRequesterVip(
      this.userAssignmentProfileRepository,
      createdByUserId,
      requestedForUserId,
    );
    const slaTargets = calculateSlaTargets(resolvedPriority, new Date(), {
      isRequesterVip,
    });
    const channelId = await resolveCreationChannelId({
      channelId: command.channelId,
      channelRepository: this.channelRepository,
      creatorRole: command.creatorRole,
    });

    const record: CreateRequestRecord = {
      approvalStatus: null,
      categoryId,
      channelId,
      ciId: normalizeOptionalId(command.ciId),
      createdByUserId,
      description,
      priorityId,
      priorityName: resolvedPriority.name,
      resolutionDueAt: slaTargets.resolutionDueAt,
      responseDueAt: slaTargets.responseDueAt,
      requestedForUserId,
      requestType: command.requestType ?? RequestType.OTHER,
      title,
    };

    const createdRequest =
      await this.ticketWriteRepository.createRequest(record);

    await this.ticketAuditService.write({
      actorUserId: createdByUserId,
      eventType: TicketHistoryEventType.CREATED,
      payload: {
        status: createdRequest.ticket.status,
        ticketNumber: createdRequest.ticket.number,
        type: createdRequest.ticket.type,
      },
      ticketId: createdRequest.ticket.id,
    });

    return createdRequest;
  }
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
