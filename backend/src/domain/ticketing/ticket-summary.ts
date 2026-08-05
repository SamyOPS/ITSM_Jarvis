import { PriorityName } from './priority-name';
import { SlaIndicator } from './sla-indicator';
import { TicketStatus } from './ticket-status';
import { TicketType } from './ticket-type';

export class TicketSummary {
  constructor(
    public readonly id: string,
    public readonly number: string,
    public readonly type: TicketType,
    public readonly status: TicketStatus,
    public readonly title: string,
    public readonly priorityId: string,
    public readonly priorityName: PriorityName | null,
    public readonly categoryId: string,
    public readonly createdByUserId: string,
    public readonly requestedForUserId: string | null,
    public readonly channelId: string | null,
    public readonly assignmentGroupId: string | null,
    public readonly assignedToUserId: string | null,
    public readonly ciId: string | null,
    public readonly createdAt: string,
    public readonly responseDueAt: string | null = null,
    public readonly resolutionDueAt: string | null = null,
    public readonly responseSlaStatus: SlaIndicator | null = null,
    public readonly resolutionSlaStatus: SlaIndicator | null = null,
    public readonly archivedAt: string | null = null,
    public readonly slaPausedAt: string | null = null,
    public readonly slaPausedDurationMs: number = 0,
  ) {}
}
