import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SearchTicketsFilters,
  TicketReadRepository,
} from '../../application/ticketing/repositories/ticket-read.repository';
import {
  CreateIncidentRecord,
  CreateRequestRecord,
  TicketWriteRepository,
} from '../../application/ticketing/repositories/ticket-write.repository';
import { CreatedIncident } from '../../domain/ticketing/created-incident';
import { CreatedRequest } from '../../domain/ticketing/created-request';
import { Incident } from '../../domain/ticketing/incident';
import { PriorityName } from '../../domain/ticketing/priority-name';
import { RequestTicket } from '../../domain/ticketing/request';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { RequestApprovalStatus } from '../../domain/ticketing/request-approval-status';
import { RequestType } from '../../domain/ticketing/request-type';
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

type SupabasePriorityRow = {
  id: string;
  name: PriorityName;
};

type SupabaseTicketDetailRow = SupabaseTicketRow & {
  incidents: SupabaseIncidentRow[];
  requests: SupabaseRequestRow[];
};

@Injectable()
export class SupabaseTicketWriteRepository
  implements TicketWriteRepository, TicketReadRepository
{
  async searchTickets(filters: SearchTicketsFilters): Promise<TicketSummary[]> {
    const query = new URLSearchParams({
      order: 'created_at.desc',
      select:
        'id,number,type,status,title,priority_id,category_id,created_by_user_id,requested_for_user_id,service_id,channel_id,assignment_group_id,assigned_to_user_id,ci_id,created_at',
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
    const body = (await response.json()) as SupabaseTicketRow[];
    const priorityNames = await this.loadPriorityNames();

    return body.map(
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
        ),
    );
  }

  async getTicketById(ticketId: string): Promise<TicketDetail | null> {
    const query = new URLSearchParams({
      select:
        'id,number,type,status,title,description,priority_id,category_id,created_by_user_id,requested_for_user_id,service_id,channel_id,assignment_group_id,assigned_to_user_id,ci_id,created_at,incidents(*),requests(*)',
      id: `eq.${ticketId}`,
      limit: '1',
    });
    const response = await this.send(`tickets?${query.toString()}`, 'GET');
    const body = (await response.json()) as SupabaseTicketDetailRow[];
    const [ticket] = body;

    if (!ticket) {
      return null;
    }

    const priorityNames = await this.loadPriorityNames();
    const [incidentRow] = ticket.incidents;
    const [requestRow] = ticket.requests;

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

  async createIncident(record: CreateIncidentRecord): Promise<CreatedIncident> {
    const ticket = await this.insertTicket({
      categoryId: record.categoryId,
      channelId: record.channelId,
      ciId: record.ciId,
      createdByUserId: record.createdByUserId,
      description: record.description,
      priorityId: record.priorityId,
      requestedForUserId: record.requestedForUserId,
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
        requested_for_user_id: record.requestedForUserId,
        service_id: record.serviceId,
        status: record.status,
        title: record.title,
        type: record.type,
      },
      true,
    );

    const body = (await response.json()) as SupabaseTicketRow[];
    const [ticket] = body;

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

    const body = (await response.json()) as SupabaseIncidentRow[];
    const [incident] = body;

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

    const body = (await response.json()) as SupabaseRequestRow[];
    const [request] = body;

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
    method: 'GET' | 'POST' | 'DELETE',
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
