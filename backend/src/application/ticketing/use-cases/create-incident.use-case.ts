import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { resolveIncidentPriorityName } from '../incident-priority';
import {
  CreateIncidentRecord,
  TicketWriteRepository,
} from '../repositories/ticket-write.repository';

export type CreateIncidentCommand = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  createdByUserId: string;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  serviceId?: string | null;
  title: string;
  urgency: IncidentSeverity;
  workaround?: string | null;
};

@Injectable()
export class CreateIncidentUseCase {
  constructor(
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityRepository: ReferentialPriorityReadRepository,
    private readonly ticketAuditService: TicketAuditService,
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

    const record: CreateIncidentRecord = {
      categoryId,
      channelId: normalizeOptionalId(command.channelId),
      ciId: normalizeOptionalId(command.ciId),
      createdByUserId,
      description,
      impact: command.impact,
      priorityId: resolvedPriority.id,
      priorityName,
      requestedForUserId: normalizeOptionalId(command.requestedForUserId),
      rootCause: normalizeOptionalText(command.rootCause),
      serviceId: normalizeOptionalId(command.serviceId),
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
