import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import {
  CreateRequestRecord,
  TicketWriteRepository,
} from '../repositories/ticket-write.repository';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { RequestType } from '../../../domain/ticketing/request-type';

export type CreateRequestCommand = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  createdByUserId: string;
  description: string;
  priorityId: string;
  requestedForUserId?: string | null;
  requestType?: RequestType | null;
  serviceId?: string | null;
  title: string;
};

@Injectable()
export class CreateRequestUseCase {
  constructor(
    @Inject(TicketWriteRepository)
    private readonly ticketWriteRepository: TicketWriteRepository,
    @Inject(ReferentialPriorityReadRepository)
    private readonly priorityRepository: ReferentialPriorityReadRepository,
  ) {}

  async execute(command: CreateRequestCommand): Promise<CreatedRequest> {
    const title = command.title.trim();
    const description = command.description.trim();
    const categoryId = command.categoryId.trim();
    const priorityId = command.priorityId.trim();

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

    const priorities = await this.priorityRepository.listPriorities();
    const resolvedPriority = priorities.find(
      (priority) => priority.id === priorityId,
    );

    if (!resolvedPriority) {
      throw new BadRequestException(
        `Priority ${priorityId} is not configured in referentials.`,
      );
    }

    const record: CreateRequestRecord = {
      approvalStatus: null,
      categoryId,
      channelId: normalizeOptionalId(command.channelId),
      ciId: normalizeOptionalId(command.ciId),
      createdByUserId: command.createdByUserId,
      description,
      priorityId,
      priorityName: resolvedPriority.name,
      requestedForUserId: normalizeOptionalId(command.requestedForUserId),
      requestType: command.requestType ?? RequestType.OTHER,
      serviceId: normalizeOptionalId(command.serviceId),
      title,
    };

    return this.ticketWriteRepository.createRequest(record);
  }
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
