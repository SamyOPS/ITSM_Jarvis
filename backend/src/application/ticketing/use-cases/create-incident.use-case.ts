import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import {
  CreateIncidentRecord,
  TicketWriteRepository,
} from '../repositories/ticket-write.repository';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { resolveIncidentPriorityName } from '../incident-priority';
import { calculateSlaTargets } from '../sla-targets';

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
  ) {}

  async execute(command: CreateIncidentCommand): Promise<CreatedIncident> {
    const title = command.title.trim();
    const description = command.description.trim();
    const categoryId = command.categoryId.trim();

    if (!title) {
      throw new BadRequestException('title is required.');
    }

    if (!description) {
      throw new BadRequestException('description is required.');
    }

    if (!categoryId) {
      throw new BadRequestException('categoryId is required.');
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
    const slaTargets = calculateSlaTargets(resolvedPriority);

    const record: CreateIncidentRecord = {
      categoryId,
      channelId: normalizeOptionalId(command.channelId),
      ciId: normalizeOptionalId(command.ciId),
      createdByUserId: command.createdByUserId,
      description,
      impact: command.impact,
      priorityId: resolvedPriority.id,
      priorityName,
      resolutionDueAt: slaTargets.resolutionDueAt,
      responseDueAt: slaTargets.responseDueAt,
      requestedForUserId: normalizeOptionalId(command.requestedForUserId),
      rootCause: normalizeOptionalText(command.rootCause),
      serviceId: normalizeOptionalId(command.serviceId),
      title,
      urgency: command.urgency,
      workaround: normalizeOptionalText(command.workaround),
    };

    return this.ticketWriteRepository.createIncident(record);
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
