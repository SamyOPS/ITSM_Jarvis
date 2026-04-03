import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ListTicketAttachmentsFilters,
  TicketAttachmentReadRepository,
} from '../../application/ticketing/repositories/ticket-attachment-read.repository';
import {
  CreateTicketAttachmentRecord,
  TicketAttachmentWriteRepository,
} from '../../application/ticketing/repositories/ticket-attachment-write.repository';
import {
  ListTicketCommentsFilters,
  TicketCommentReadRepository,
} from '../../application/ticketing/repositories/ticket-comment-read.repository';
import {
  CreateTicketCommentRecord,
  TicketCommentWriteRepository,
} from '../../application/ticketing/repositories/ticket-comment-write.repository';
import {
  SearchTicketsFilters,
  TicketReadRepository,
} from '../../application/ticketing/repositories/ticket-read.repository';
import {
  CreateIncidentRecord,
  CreateRequestRecord,
  TicketWriteRepository,
  UpdateTicketAssignmentRecord,
} from '../../application/ticketing/repositories/ticket-write.repository';
import { CreateTicketHistoryRecord } from '../../application/ticketing/repositories/ticket-history-write.repository';
import { CreatedIncident } from '../../domain/ticketing/created-incident';
import { CreatedRequest } from '../../domain/ticketing/created-request';
import { Incident } from '../../domain/ticketing/incident';
import { TicketAttachment } from '../../domain/ticketing/ticket-attachment';
import { PriorityName } from '../../domain/ticketing/priority-name';
import { RequestApprovalStatus } from '../../domain/ticketing/request-approval-status';
import { RequestTicket } from '../../domain/ticketing/request';
import { RequestType } from '../../domain/ticketing/request-type';
import { TicketComment } from '../../domain/ticketing/ticket-comment';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { TicketSummary } from '../../domain/ticketing/ticket-summary';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseTicketRow = {
  assigned_to_user_id: string | null;
  assignment_group_id: string | null;
  category_id: string;
  channel_id: string | null;
  ci_id: string | null;
  created_at: string;
  created_by_user_id: string;
  description: string;
  id: string;
  number: string;
  priority_id: string;
  resolution_due_at: string | null;
  response_due_at: string | null;
  requested_for_user_id: string | null;
  service_id: string | null;
  status: TicketStatus;
  title: string;
  type: TicketType;
};

type SupabaseIncidentRow = {
  impact: CreateIncidentRecord['impact'];
  root_cause: string | null;
  ticket_id: string;
  urgency: CreateIncidentRecord['urgency'];
  workaround: string | null;
};

type SupabaseRequestRow = {
  approval_status: RequestApprovalStatus | null;
  fulfilled_at: string | null;
  request_type: RequestType;
  ticket_id: string;
};

type SupabaseTicketCommentRow = {
  author_user_id: string;
  body: string;
  created_at: string;
  id: string;
  is_internal: boolean;
  ticket_id: string;
};

type SupabaseTicketAttachmentRow = {
  bucket_id: string;
  created_at: string;
  file_name: string;
  id: string;
  mime_type: string | null;
  size_bytes: number | string;
  storage_path: string;
  ticket_id: string;
  uploaded_by_user_id: string;
};

type SupabasePriorityRow = {
  id: string;
  name: PriorityName;
};

type SupabaseTicketDetailRow = SupabaseTicketRow & {
  incidents: SupabaseIncidentRow | SupabaseIncidentRow[] | null;
  requests: SupabaseRequestRow | SupabaseRequestRow[] | null;
};

@Injectable()
export class SupabaseTicketWriteRepository
  implements
    TicketWriteRepository,
    TicketReadRepository,
    TicketCommentReadRepository,
    TicketCommentWriteRepository,
    TicketAttachmentReadRepository,
    TicketAttachmentWriteRepository
{
  async updateAssignment(
    ticketId: string,
    record: UpdateTicketAssignmentRecord,
  ): Promise<void> {
    await this.send(
      `tickets?id=eq.${ticketId}`,
      'PATCH',
      {
        assigned_to_user_id: record.assignedToUserId,
        assignment_group_id: record.assignmentGroupId,
      },
      false,
    );
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<void> {
    await this.send(
      `tickets?id=eq.${ticketId}`,
      'PATCH',
      {
        status,
      },
      false,
    );
  }

  async updatePriority(
    ticketId: string,
    record: {
      priorityId: string;
      responseDueAt: string | null;
      resolutionDueAt: string | null;
    },
  ): Promise<void> {
    await this.send(
      `tickets?id=eq.${ticketId}`,
      'PATCH',
      {
        priority_id: record.priorityId,
        resolution_due_at: record.resolutionDueAt,
        response_due_at: record.responseDueAt,
      },
      false,
    );
  }

  async searchTickets(filters: SearchTicketsFilters): Promise<TicketSummary[]> {
    const query = new URLSearchParams({
      order: 'created_at.desc',
      select:
        'id,number,type,status,title,priority_id,category_id,created_by_user_id,requested_for_user_id,service_id,channel_id,assignment_group_id,assigned_to_user_id,ci_id,created_at,response_due_at,resolution_due_at',
    });

    applyOptionalFilter(query, 'assigned_to_user_id', filters.assignedToUserId);
    applyOptionalFilter(
      query,
      'assignment_group_id',
      filters.assignmentGroupId,
    );
    applyOptionalFilter(query, 'category_id', filters.categoryId);
    applyOptionalFilter(query, 'channel_id', filters.channelId);
    applyOptionalFilter(query, 'created_by_user_id', filters.createdByUserId);
    applyOptionalFilter(query, 'priority_id', filters.priorityId);
    applyOptionalFilter(
      query,
      'requested_for_user_id',
      filters.requestedForUserId,
    );
    applyOptionalFilter(query, 'service_id', filters.serviceId);

    if (filters.status) {
      query.set('status', `eq.${filters.status}`);
    }

    if (filters.type) {
      query.set('type', `eq.${filters.type}`);
    }

    if (filters.q) {
      query.set(
        'or',
        `(number.ilike.*${filters.q}*,title.ilike.*${filters.q}*,description.ilike.*${filters.q}*)`,
      );
    }

    const response = await this.send(`tickets?${query.toString()}`, 'GET');
    const body = (await response.json()) as
      | SupabaseTicketRow[]
      | SupabaseTicketRow
      | null;
    const priorityNames = await this.loadPriorityNames();

    return normalizeRows(body).map(
      (ticket) =>
        new TicketSummary(
          ticket.id,
          ticket.number,
          ticket.type,
          ticket.status,
          ticket.title,
          ticket.priority_id,
          priorityNames.get(ticket.priority_id) ?? null,
          ticket.category_id,
          ticket.created_by_user_id,
          ticket.requested_for_user_id,
          ticket.service_id,
          ticket.channel_id,
          ticket.assignment_group_id,
          ticket.assigned_to_user_id,
          ticket.ci_id,
          ticket.created_at,
          ticket.response_due_at,
          ticket.resolution_due_at,
        ),
    );
  }

  async getTicketById(ticketId: string): Promise<TicketDetail | null> {
    const query = new URLSearchParams({
      select:
        'id,number,type,status,title,description,priority_id,category_id,created_by_user_id,requested_for_user_id,service_id,channel_id,assignment_group_id,assigned_to_user_id,ci_id,created_at,response_due_at,resolution_due_at,incidents(*),requests(*)',
      id: `eq.${ticketId}`,
      limit: '1',
    });
    const response = await this.send(`tickets?${query.toString()}`, 'GET');
    const body = (await response.json()) as
      | SupabaseTicketDetailRow[]
      | SupabaseTicketDetailRow
      | null;
    const ticket = extractSingleRow(body);

    if (!ticket) {
      return null;
    }

    const priorityNames = await this.loadPriorityNames();
    const incidentRow = getEmbeddedRow(ticket.incidents);
    const requestRow = getEmbeddedRow(ticket.requests);

    return new TicketDetail(
      new Ticket(
        ticket.id,
        ticket.number,
        ticket.type,
        ticket.status,
        ticket.title,
        ticket.description,
        ticket.priority_id,
        ticket.category_id,
        ticket.created_by_user_id,
        ticket.requested_for_user_id,
        ticket.service_id,
        ticket.channel_id,
        ticket.assignment_group_id,
        ticket.assigned_to_user_id,
        ticket.ci_id,
        ticket.created_at,
        ticket.response_due_at,
        ticket.resolution_due_at,
      ),
      priorityNames.get(ticket.priority_id) ?? null,
      incidentRow
        ? new Incident(
            incidentRow.ticket_id,
            incidentRow.impact,
            incidentRow.urgency,
            incidentRow.root_cause,
            incidentRow.workaround,
          )
        : null,
      requestRow
        ? new RequestTicket(
            requestRow.ticket_id,
            requestRow.request_type,
            requestRow.approval_status,
            requestRow.fulfilled_at,
          )
        : null,
    );
  }

  async listTicketComments(
    filters: ListTicketCommentsFilters,
  ): Promise<TicketComment[]> {
    const query = new URLSearchParams({
      order: 'created_at.asc',
      select: 'id,ticket_id,author_user_id,body,is_internal,created_at',
      ticket_id: `eq.${filters.ticketId}`,
    });

    if (!filters.includeInternal) {
      query.set('is_internal', 'eq.false');
    }

    const response = await this.send(
      `ticket_comments?${query.toString()}`,
      'GET',
    );
    const body = (await response.json()) as
      | SupabaseTicketCommentRow[]
      | SupabaseTicketCommentRow
      | null;

    return normalizeRows(body).map(
      (comment) =>
        new TicketComment(
          comment.id,
          comment.ticket_id,
          comment.author_user_id,
          comment.body,
          comment.is_internal,
          comment.created_at,
        ),
    );
  }

  async addTicketComment(
    record: CreateTicketCommentRecord,
  ): Promise<TicketComment> {
    const response = await this.send(
      'ticket_comments',
      'POST',
      {
        author_user_id: record.authorUserId,
        body: record.body,
        is_internal: record.isInternal,
        ticket_id: record.ticketId,
      },
      true,
    );

    const body = (await response.json()) as
      | SupabaseTicketCommentRow[]
      | SupabaseTicketCommentRow
      | null;
    const comment = extractSingleRow(body);

    if (!comment) {
      throw new ServiceUnavailableException(
        'Ticket comment creation did not return a persisted row.',
      );
    }

    return new TicketComment(
      comment.id,
      comment.ticket_id,
      comment.author_user_id,
      comment.body,
      comment.is_internal,
      comment.created_at,
    );
  }

  async listTicketAttachments(
    filters: ListTicketAttachmentsFilters,
  ): Promise<TicketAttachment[]> {
    const query = new URLSearchParams({
      order: 'created_at.asc',
      select:
        'id,ticket_id,uploaded_by_user_id,bucket_id,storage_path,file_name,mime_type,size_bytes,created_at',
      ticket_id: `eq.${filters.ticketId}`,
    });

    const response = await this.send(
      `ticket_attachments?${query.toString()}`,
      'GET',
    );
    const body = (await response.json()) as
      | SupabaseTicketAttachmentRow[]
      | SupabaseTicketAttachmentRow
      | null;

    return normalizeRows(body).map(
      (attachment) =>
        new TicketAttachment(
          attachment.id,
          attachment.ticket_id,
          attachment.uploaded_by_user_id,
          attachment.bucket_id,
          attachment.storage_path,
          attachment.file_name,
          attachment.mime_type,
          Number(attachment.size_bytes),
          attachment.created_at,
        ),
    );
  }

  async addTicketHistoryEntry(
    record: CreateTicketHistoryRecord,
  ): Promise<void> {
    await this.send(
      'ticket_history',
      'POST',
      {
        actor_user_id: record.actorUserId,
        event_type: record.eventType,
        payload: record.payload ?? null,
        ticket_id: record.ticketId,
      },
      false,
    );
  }

  async addTicketAttachment(
    record: CreateTicketAttachmentRecord,
  ): Promise<TicketAttachment> {
    const response = await this.send(
      'ticket_attachments',
      'POST',
      {
        bucket_id: record.bucketId,
        file_name: record.fileName,
        mime_type: record.mimeType,
        size_bytes: record.sizeBytes,
        storage_path: record.storagePath,
        ticket_id: record.ticketId,
        uploaded_by_user_id: record.uploadedByUserId,
      },
      true,
    );

    const body = (await response.json()) as
      | SupabaseTicketAttachmentRow[]
      | SupabaseTicketAttachmentRow
      | null;
    const attachment = extractSingleRow(body);

    if (!attachment) {
      throw new ServiceUnavailableException(
        'Ticket attachment creation did not return a persisted row.',
      );
    }

    return new TicketAttachment(
      attachment.id,
      attachment.ticket_id,
      attachment.uploaded_by_user_id,
      attachment.bucket_id,
      attachment.storage_path,
      attachment.file_name,
      attachment.mime_type,
      Number(attachment.size_bytes),
      attachment.created_at,
    );
  }

  async createIncident(record: CreateIncidentRecord): Promise<CreatedIncident> {
    const ticket = await this.insertTicket({
      categoryId: record.categoryId,
      channelId: record.channelId,
      ciId: record.ciId,
      createdByUserId: record.createdByUserId,
      description: record.description,
      priorityId: record.priorityId,
      requestedForUserId: record.requestedForUserId,
      resolutionDueAt: record.resolutionDueAt,
      responseDueAt: record.responseDueAt,
      serviceId: record.serviceId,
      status: TicketStatus.OPEN,
      title: record.title,
      type: TicketType.INCIDENT,
    });

    try {
      const incident = await this.insertIncident(ticket.id, record);

      return new CreatedIncident(
        new Ticket(
          ticket.id,
          ticket.number,
          ticket.type,
          ticket.status,
          ticket.title,
          ticket.description,
          ticket.priority_id,
          ticket.category_id,
          ticket.created_by_user_id,
          ticket.requested_for_user_id,
          ticket.service_id,
          ticket.channel_id,
          ticket.assignment_group_id,
          ticket.assigned_to_user_id,
          ticket.ci_id,
          ticket.created_at,
          ticket.response_due_at,
          ticket.resolution_due_at,
        ),
        new Incident(
          incident.ticket_id,
          incident.impact,
          incident.urgency,
          incident.root_cause,
          incident.workaround,
        ),
        record.priorityName,
      );
    } catch (error) {
      await this.deleteTicketSilently(ticket.id);
      throw error;
    }
  }

  async createRequest(record: CreateRequestRecord): Promise<CreatedRequest> {
    const ticket = await this.insertTicket({
      categoryId: record.categoryId,
      channelId: record.channelId,
      ciId: record.ciId,
      createdByUserId: record.createdByUserId,
      description: record.description,
      priorityId: record.priorityId,
      requestedForUserId: record.requestedForUserId,
      resolutionDueAt: record.resolutionDueAt,
      responseDueAt: record.responseDueAt,
      serviceId: record.serviceId,
      status: TicketStatus.OPEN,
      title: record.title,
      type: TicketType.REQUEST,
    });

    try {
      const request = await this.insertRequest(ticket.id, record);

      return new CreatedRequest(
        new Ticket(
          ticket.id,
          ticket.number,
          ticket.type,
          ticket.status,
          ticket.title,
          ticket.description,
          ticket.priority_id,
          ticket.category_id,
          ticket.created_by_user_id,
          ticket.requested_for_user_id,
          ticket.service_id,
          ticket.channel_id,
          ticket.assignment_group_id,
          ticket.assigned_to_user_id,
          ticket.ci_id,
          ticket.created_at,
          ticket.response_due_at,
          ticket.resolution_due_at,
        ),
        new RequestTicket(
          request.ticket_id,
          request.request_type,
          request.approval_status,
          request.fulfilled_at,
        ),
        record.priorityName,
      );
    } catch (error) {
      await this.deleteTicketSilently(ticket.id);
      throw error;
    }
  }

  private async insertTicket(record: {
    categoryId: string;
    channelId: string | null;
    ciId: string | null;
    createdByUserId: string;
    description: string;
    priorityId: string;
    resolutionDueAt: string | null;
    responseDueAt: string | null;
    requestedForUserId: string | null;
    serviceId: string | null;
    status: TicketStatus;
    title: string;
    type: TicketType;
  }): Promise<SupabaseTicketRow> {
    const response = await this.send(
      'tickets',
      'POST',
      {
        category_id: record.categoryId,
        channel_id: record.channelId,
        ci_id: record.ciId,
        created_by_user_id: record.createdByUserId,
        description: record.description,
        priority_id: record.priorityId,
        resolution_due_at: record.resolutionDueAt,
        response_due_at: record.responseDueAt,
        requested_for_user_id: record.requestedForUserId,
        service_id: record.serviceId,
        status: record.status,
        title: record.title,
        type: record.type,
      },
      true,
    );

    const body = (await response.json()) as
      | SupabaseTicketRow[]
      | SupabaseTicketRow
      | null;
    const ticket = extractSingleRow(body);

    if (!ticket) {
      throw new ServiceUnavailableException(
        'Ticket creation did not return a persisted row.',
      );
    }

    return ticket;
  }

  private async insertIncident(
    ticketId: string,
    record: CreateIncidentRecord,
  ): Promise<SupabaseIncidentRow> {
    const response = await this.send(
      'incidents',
      'POST',
      {
        impact: record.impact,
        root_cause: record.rootCause,
        ticket_id: ticketId,
        urgency: record.urgency,
        workaround: record.workaround,
      },
      true,
    );

    const body = (await response.json()) as
      | SupabaseIncidentRow[]
      | SupabaseIncidentRow
      | null;
    const incident = extractSingleRow(body);

    if (!incident) {
      throw new ServiceUnavailableException(
        'Incident creation did not return a persisted row.',
      );
    }

    return incident;
  }

  private async insertRequest(
    ticketId: string,
    record: CreateRequestRecord,
  ): Promise<SupabaseRequestRow> {
    const response = await this.send(
      'requests',
      'POST',
      {
        approval_status: record.approvalStatus,
        request_type: record.requestType,
        ticket_id: ticketId,
      },
      true,
    );

    const body = (await response.json()) as
      | SupabaseRequestRow[]
      | SupabaseRequestRow
      | null;
    const request = extractSingleRow(body);

    if (!request) {
      throw new ServiceUnavailableException(
        'Request creation did not return a persisted row.',
      );
    }

    return request;
  }

  private async deleteTicketSilently(ticketId: string): Promise<void> {
    try {
      await this.send(`tickets?id=eq.${ticketId}`, 'DELETE', undefined, false);
    } catch {
      // Keep the original error, cleanup is best-effort only.
    }
  }

  private async send(
    path: string,
    method: 'GET' | 'PATCH' | 'POST' | 'DELETE',
    body?: unknown,
    returnRepresentation = false,
  ): Promise<Response> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseServiceRoleKey || config.supabaseAnonKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase ticketing configuration is incomplete on the backend.',
      );
    }

    let response: Response;

    try {
      response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
        method,
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Prefer: returnRepresentation
            ? 'return=representation'
            : 'return=minimal',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Supabase ticketing tables are unreachable from the backend.',
      );
    }

    if (!response.ok) {
      const message = await response.text();

      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(
          message ||
            `Supabase ticketing write failed with status ${response.status}.`,
        );
      }

      throw new ServiceUnavailableException(
        message ||
          `Supabase ticketing write failed with status ${response.status}.`,
      );
    }

    return response;
  }

  private async loadPriorityNames(): Promise<Map<string, PriorityName>> {
    const response = await this.send('priorities?select=id,name', 'GET');
    const body = (await response.json()) as SupabasePriorityRow[];

    return new Map(body.map((priority) => [priority.id, priority.name]));
  }
}

function applyOptionalFilter(
  query: URLSearchParams,
  column: string,
  value: string | null | undefined,
): void {
  if (!value) {
    return;
  }

  query.set(column, `eq.${value}`);
}

function getEmbeddedRow<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeRows<T>(payload: T[] | T | null | undefined): T[] {
  if (!payload) {
    return [];
  }

  return Array.isArray(payload) ? payload : [payload];
}

function extractSingleRow<T>(payload: T[] | T | null | undefined): T | null {
  return normalizeRows(payload)[0] ?? null;
}
