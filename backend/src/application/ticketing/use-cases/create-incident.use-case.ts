import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { ReferentialChannelReadRepository } from '../../referentials/repositories/referential-channel-read.repository';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { resolveCreationChannelId } from '../creation-channel';
import { resolveIncidentPriorityName } from '../incident-priority';
import {
  CreateIncidentRecord,
  TicketWriteRepository,
} from '../repositories/ticket-write.repository';
import { calculateSlaTargets } from '../sla-targets';
import { isTicketRequesterVip } from '../ticket-requester-vip';

export type CreateIncidentCommand = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  creatorRole: UserRole;
  createdByUserId: string;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  title: string;
  urgency: IncidentSeverity;
  workaround?: string | null;
};

@Injectable()
export class CreateIncidentUseCase {
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

  async execute(command: CreateIncidentCommand): Promise<CreatedIncident> {
    const title = command.title.trim();
    const description = command.description.trim();
    const categoryId = command.categoryId.trim();
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

    if (!createdByUserId) {
      throw new BadRequestException('createdByUserId is required.');
    }

    const priorityName = resolveIncidentPriorityName(
      command.impact,
      command.urgency,
    );
    const priorities = await this.priorityRepository.listPriorities();
    const resolvedPriority = priorities.find(
      (priority) => priority.name === priorityName,
    );

    if (!resolvedPriority) {
      throw new BadRequestException(
        `Priority ${priorityName} is not configured in referentials.`,
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

    const record: CreateIncidentRecord = {
      categoryId,
      channelId,
      ciId: normalizeOptionalId(command.ciId),
      createdByUserId,
      description,
      impact: command.impact,
      priorityId: resolvedPriority.id,
      priorityName,
      resolutionDueAt: slaTargets.resolutionDueAt,
      responseDueAt: slaTargets.responseDueAt,
      requestedForUserId,
      rootCause: normalizeOptionalText(command.rootCause),
      title,
      urgency: command.urgency,
      workaround: normalizeOptionalText(command.workaround),
    };

    const createdIncident =
      await this.ticketWriteRepository.createIncident(record);

    await this.ticketAuditService.write({
      actorUserId: createdByUserId,
      eventType: TicketHistoryEventType.CREATED,
      payload: {
        status: createdIncident.ticket.status,
        ticketNumber: createdIncident.ticket.number,
        type: createdIncident.ticket.type,
      },
      ticketId: createdIncident.ticket.id,
    });

    return createdIncident;
  }
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
