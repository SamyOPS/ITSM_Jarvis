import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TicketSummary } from '../../../domain/ticketing/ticket-summary';
import {
  SearchTicketsFilters,
  TicketReadRepository,
} from '../repositories/ticket-read.repository';

export type SearchTicketsQuery = SearchTicketsFilters;

@Injectable()
export class SearchTicketsUseCase {
  constructor(
    @Inject(TicketReadRepository)
    private readonly ticketReadRepository: TicketReadRepository,
  ) {}

  async execute(query: SearchTicketsQuery): Promise<TicketSummary[]> {
    return this.ticketReadRepository.searchTickets({
      assignedToUserId: normalizeOptionalId(query.assignedToUserId),
      assignmentGroupId: normalizeOptionalId(query.assignmentGroupId),
      categoryId: normalizeOptionalId(query.categoryId),
      channelId: normalizeOptionalId(query.channelId),
      createdByUserId: normalizeOptionalId(query.createdByUserId),
      priorityId: normalizeOptionalId(query.priorityId),
      q: normalizeOptionalText(query.q),
      requestedForUserId: normalizeOptionalId(query.requestedForUserId),
      serviceId: normalizeOptionalId(query.serviceId),
      status: query.status ?? null,
      type: query.type ?? null,
    });
  }
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length < 2) {
    throw new BadRequestException('q must contain at least 2 characters.');
  }

  return normalized;
}
