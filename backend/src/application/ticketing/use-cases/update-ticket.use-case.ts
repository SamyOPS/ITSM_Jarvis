import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { UserRole } from '../../../domain/auth/user-role';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketRuleError } from '../../../domain/ticketing/ticket-rule.error';
import { calculateSlaTargets } from '../sla-targets';
import { resolveIncidentPriorityName } from '../incident-priority';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import {
  TicketWriteRepository,
  type UpdateTicketRecord,
} from '../repositories/ticket-write.repository';
import { assertTicketCanBeModifiedByRole } from '../ticketing-rules';

export type UpdateTicketCommand = {
  actorRole: UserRole;
  actorUserId: string;
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  impact?: IncidentSeverity | null;
  requestedForUserId?: string | null;
  rootCause?: string | null;
  ticketId: string;
  title: string;
  urgency?: IncidentSeverity | null;
  workaround?: string | null;
};

@Injectable()
export class UpdateTicketUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityRepository: ReferentialPriorityReadRepository,
  ) {}

  async execute(command: UpdateTicketCommand): Promise<TicketDetail> {
    const ticketId = command.ticketId.trim();
    const actorUserId = command.actorUserId.trim();
    const title = command.title.trim();
    const description = command.description.trim();
    const categoryId = command.categoryId.trim();

    if (!ticketId) {
      throw new BadRequestException('ticketId is required.');
    }

    if (!actorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    if (command.actorRole !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can update tickets.');
    }

    if (!title) {
      throw new BadRequestException('title is required.');
    }

    if (!description) {
      throw new BadRequestException('description is required.');
    }

    if (!categoryId) {
      throw new BadRequestException('categoryId is required.');
    }

    const existingTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!existingTicket) {
      throw new NotFoundException(`Ticket ${ticketId} was not found.`);
    }

    if (existingTicket.ticket.archivedAt) {
      throw new BadRequestException(
        'Archived tickets cannot be updated anymore.',
      );
    }

    try {
      assertTicketCanBeModifiedByRole(
        existingTicket.ticket.status,
        existingTicket.ticket.archivedAt,
        command.actorRole,
      );
    } catch (error) {
      if (error instanceof TicketRuleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    let incidentRecord: UpdateTicketRecord['incident'] = undefined;
    let priorityId: string | null = null;
    let responseDueAt: string | null = null;
    let resolutionDueAt: string | null = null;

    if (existingTicket.ticket.type === TicketType.INCIDENT) {
      if (!existingTicket.incident) {
        throw new BadRequestException(
          `Ticket ${ticketId} has no incident details to update.`,
        );
      }

      const impact = command.impact ?? existingTicket.incident.impact;
      const urgency = command.urgency ?? existingTicket.incident.urgency;

      if (!isIncidentSeverity(impact)) {
        throw new BadRequestException('impact is invalid.');
      }

      if (!isIncidentSeverity(urgency)) {
        throw new BadRequestException('urgency is invalid.');
      }

      incidentRecord = {
        impact,
        rootCause: normalizeOptionalText(command.rootCause),
        urgency,
        workaround: normalizeOptionalText(command.workaround),
      };

      const priorities = await this.priorityRepository.listPriorities();
      const priorityName = resolveIncidentPriorityName(impact, urgency);
      const resolvedPriority = priorities.find(
        (priority) => priority.name === priorityName,
      );

      if (!resolvedPriority) {
        throw new BadRequestException(
          `Priority ${priorityName} is not configured in referentials.`,
        );
      }

      priorityId = resolvedPriority.id;
      const slaTargets = calculateSlaTargets(resolvedPriority);
      responseDueAt = slaTargets.responseDueAt;
      resolutionDueAt = slaTargets.resolutionDueAt;
    }

    const record: UpdateTicketRecord = {
      categoryId,
      channelId: normalizeOptionalId(command.channelId),
      ciId: normalizeOptionalId(command.ciId),
      description,
      incident: incidentRecord,
      priorityId,
      requestedForUserId: normalizeOptionalId(command.requestedForUserId),
      resolutionDueAt,
      responseDueAt,
      title,
    };

    await this.ticketWriteRepository.updateTicket(ticketId, record);

    const updatedTicket =
      await this.ticketReadRepository.getTicketById(ticketId);

    if (!updatedTicket) {
      throw new BadRequestException(
        `Ticket ${ticketId} could not be reloaded after update.`,
      );
    }

    return updatedTicket;
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

function isIncidentSeverity(
  value: IncidentSeverity | null | undefined,
): value is IncidentSeverity {
  return (
    value === IncidentSeverity.LOW ||
    value === IncidentSeverity.MEDIUM ||
    value === IncidentSeverity.HIGH
  );
}
