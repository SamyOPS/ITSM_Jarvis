import { ReferentialPriorityReadRepository } from '../../referentials/repositories/referential-priority-read.repository';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { UserRole } from '../../../domain/auth/user-role';
import { UserAssignmentProfileRepository } from '../../auth/repositories/user-assignment-profile.repository';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { Incident } from '../../../domain/ticketing/incident';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import {
  CreateIncidentRecord,
  TicketWriteRepository,
  UpdateTicketAssignmentRecord,
} from '../repositories/ticket-write.repository';
import { AssignTicketUseCase } from './assign-ticket.use-case';
import { ChangeTicketStatusUseCase } from './change-ticket-status.use-case';
import { CreateIncidentUseCase } from './create-incident.use-case';

describe('Ticket flow', () => {
  it('creates an incident, assigns it, then changes its status', async () => {
    const repository = new InMemoryTicketRepository();
    const createIncidentUseCase = new CreateIncidentUseCase(repository, {
      listPriorities: jest
        .fn()
        .mockResolvedValue([
          new ReferentialPriority('priority-high', PriorityName.HIGH, 3, 4, 8),
        ]),
    } as ReferentialPriorityReadRepository);
    const assignTicketUseCase = new AssignTicketUseCase(
      repository,
      repository,
      {
        getById: jest.fn().mockResolvedValue({
          groupId: 'group-1',
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        }),
      } as UserAssignmentProfileRepository,
    );
    const changeTicketStatusUseCase = new ChangeTicketStatusUseCase(
      repository,
      repository,
    );

    const createdIncident = await createIncidentUseCase.execute({
      categoryId: 'category-1',
      channelId: 'channel-portal',
      createdByUserId: 'demandeur-1',
      description: 'Impossible de se connecter au VPN depuis ce matin',
      impact: IncidentSeverity.HIGH,
      requestedForUserId: 'demandeur-1',
      serviceId: 'service-vpn',
      title: 'VPN inaccessible',
      urgency: IncidentSeverity.MEDIUM,
    });

    expect(createdIncident).toBeInstanceOf(CreatedIncident);
    expect(createdIncident.ticket.status).toBe(TicketStatus.OPEN);
    expect(createdIncident.priorityName).toBe(PriorityName.HIGH);

    const assignedTicket = await assignTicketUseCase.execute({
      assignedToUserId: 'agent-1',
      assignmentGroupId: 'group-1',
      ticketId: createdIncident.ticket.id,
    });

    expect(assignedTicket.ticket.assignmentGroupId).toBe('group-1');
    expect(assignedTicket.ticket.assignedToUserId).toBe('agent-1');

    const updatedTicket = await changeTicketStatusUseCase.execute({
      status: TicketStatus.IN_PROGRESS,
      ticketId: createdIncident.ticket.id,
    });

    expect(updatedTicket.ticket.status).toBe(TicketStatus.IN_PROGRESS);

    const reloadedTicket = await repository.getTicketById(
      createdIncident.ticket.id,
    );

    expect(reloadedTicket).toMatchObject({
      ticket: {
        assignedToUserId: 'agent-1',
        assignmentGroupId: 'group-1',
        createdByUserId: 'demandeur-1',
        requestedForUserId: 'demandeur-1',
        status: TicketStatus.IN_PROGRESS,
        title: 'VPN inaccessible',
        type: TicketType.INCIDENT,
      },
      incident: {
        impact: IncidentSeverity.HIGH,
        urgency: IncidentSeverity.MEDIUM,
      },
      priorityName: PriorityName.HIGH,
    });
  });
});

class InMemoryTicketRepository
  implements TicketWriteRepository, TicketReadRepository
{
  private readonly tickets = new Map<
    string,
    {
      incident: Incident | null;
      priorityName: PriorityName;
      ticket: Ticket;
    }
  >();

  createIncident(record: CreateIncidentRecord): Promise<CreatedIncident> {
    const ticketId = 'ticket-1';
    const createdTicket = new Ticket(
      ticketId,
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      record.title,
      record.description,
      record.priorityId,
      record.categoryId,
      record.createdByUserId,
      record.requestedForUserId,
      record.serviceId,
      record.channelId,
      null,
      null,
      record.ciId,
      '2026-04-03T09:00:00.000Z',
    );
    const createdIncident = new Incident(
      ticketId,
      record.impact,
      record.urgency,
      record.rootCause,
      record.workaround,
    );

    this.tickets.set(ticketId, {
      incident: createdIncident,
      priorityName: record.priorityName,
      ticket: createdTicket,
    });

    return Promise.resolve(
      new CreatedIncident(createdTicket, createdIncident, record.priorityName),
    );
  }

  createRequest(): Promise<never> {
    throw new Error('Not implemented in this flow test.');
  }

  updateAssignment(
    ticketId: string,
    record: UpdateTicketAssignmentRecord,
  ): Promise<void> {
    const current = this.tickets.get(ticketId);

    if (!current) {
      throw new Error(`Ticket ${ticketId} not found in memory.`);
    }

    this.tickets.set(ticketId, {
      ...current,
      ticket: new Ticket(
        current.ticket.id,
        current.ticket.number,
        current.ticket.type,
        current.ticket.status,
        current.ticket.title,
        current.ticket.description,
        current.ticket.priorityId,
        current.ticket.categoryId,
        current.ticket.createdByUserId,
        current.ticket.requestedForUserId,
        current.ticket.serviceId,
        current.ticket.channelId,
        record.assignmentGroupId,
        record.assignedToUserId,
        current.ticket.ciId,
        current.ticket.createdAt,
      ),
    });

    return Promise.resolve();
  }

  updateStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const current = this.tickets.get(ticketId);

    if (!current) {
      throw new Error(`Ticket ${ticketId} not found in memory.`);
    }

    this.tickets.set(ticketId, {
      ...current,
      ticket: new Ticket(
        current.ticket.id,
        current.ticket.number,
        current.ticket.type,
        status,
        current.ticket.title,
        current.ticket.description,
        current.ticket.priorityId,
        current.ticket.categoryId,
        current.ticket.createdByUserId,
        current.ticket.requestedForUserId,
        current.ticket.serviceId,
        current.ticket.channelId,
        current.ticket.assignmentGroupId,
        current.ticket.assignedToUserId,
        current.ticket.ciId,
        current.ticket.createdAt,
      ),
    });

    return Promise.resolve();
  }

  getTicketById(ticketId: string): Promise<TicketDetail | null> {
    const current = this.tickets.get(ticketId);

    if (!current) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new TicketDetail(
        current.ticket,
        current.priorityName,
        current.incident,
        null,
      ),
    );
  }

  searchTickets(): Promise<[]> {
    return Promise.resolve([]);
  }
}
