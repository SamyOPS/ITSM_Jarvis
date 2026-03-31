import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CreateIncidentRecord,
  TicketWriteRepository,
} from '../../application/ticketing/repositories/ticket-write.repository';
import { CreatedIncident } from '../../domain/ticketing/created-incident';
import { Incident } from '../../domain/ticketing/incident';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
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

@Injectable()
export class SupabaseTicketWriteRepository implements TicketWriteRepository {
  async createIncident(record: CreateIncidentRecord): Promise<CreatedIncident> {
    const ticket = await this.insertTicket(record);

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

  private async insertTicket(
    record: CreateIncidentRecord,
  ): Promise<SupabaseTicketRow> {
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
        status: TicketStatus.OPEN,
        title: record.title,
        type: TicketType.INCIDENT,
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

  private async deleteTicketSilently(ticketId: string): Promise<void> {
    try {
      await this.send(`tickets?id=eq.${ticketId}`, 'DELETE', undefined, false);
    } catch {
      // Keep the original error, cleanup is best-effort only.
    }
  }

  private async send(
    path: string,
    method: 'POST' | 'DELETE',
    body: unknown,
    returnRepresentation: boolean,
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
}
