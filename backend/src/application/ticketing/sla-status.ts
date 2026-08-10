import { SlaIndicator } from '../../domain/ticketing/sla-indicator';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketStatus } from '../../domain/ticketing/ticket-status';

export type TicketSlaStatus = {
  resolutionSlaStatus: SlaIndicator | null;
  responseSlaStatus: SlaIndicator | null;
};

export function calculateTicketSlaStatus(
  ticket: Ticket,
  now = new Date(),
): TicketSlaStatus {
  return {
    resolutionSlaStatus: getResolutionSlaStatus(ticket, now),
    responseSlaStatus: getResponseSlaStatus(ticket, now),
  };
}

function getResponseSlaStatus(ticket: Ticket, now: Date): SlaIndicator | null {
  if (!ticket.responseDueAt) {
    return null;
  }

  if (ticket.status !== TicketStatus.OPEN) {
    return SlaIndicator.OK;
  }

  return getIndicator(ticket.createdAt, ticket.responseDueAt, now);
}

function getResolutionSlaStatus(
  ticket: Ticket,
  now: Date,
): SlaIndicator | null {
  if (!ticket.resolutionDueAt) {
    return null;
  }

  if (
    ticket.status === TicketStatus.RESOLVED ||
    ticket.status === TicketStatus.CLOSED
  ) {
    return SlaIndicator.OK;
  }

  if (ticket.status === TicketStatus.PENDING) {
    return ticket.slaPausedAt
      ? getIndicator(
          ticket.createdAt,
          ticket.resolutionDueAt,
          new Date(ticket.slaPausedAt),
        )
      : SlaIndicator.OK;
  }

  return getIndicator(ticket.createdAt, ticket.resolutionDueAt, now);
}

function getIndicator(
  createdAtIso: string,
  dueAtIso: string,
  now: Date,
): SlaIndicator {
  const createdAt = new Date(createdAtIso);
  const dueAt = new Date(dueAtIso);
  const initialDurationMs = dueAt.getTime() - createdAt.getTime();
  const remainingMs = dueAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return SlaIndicator.OVERDUE;
  }

  if (initialDurationMs <= 0) {
    return SlaIndicator.OK;
  }

  return remainingMs <= initialDurationMs * 0.25
    ? SlaIndicator.AT_RISK
    : SlaIndicator.OK;
}
