import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { RequestType } from '../../../domain/ticketing/request-type';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;
  const createIncident = jest.fn().mockResolvedValue({
    incident: {
      impact: IncidentSeverity.HIGH,
      urgency: IncidentSeverity.MEDIUM,
    },
    priorityName: 'HIGH',
    ticket: { id: 'ticket-1', number: 'TICK-000001' },
  });
  const createRequest = jest.fn().mockResolvedValue({
    priorityName: 'MEDIUM',
    request: {
      approvalStatus: null,
      fulfilledAt: null,
      requestType: RequestType.ACCESS,
      ticketId: 'ticket-2',
    },
    ticket: { id: 'ticket-2', number: 'TICK-000002' },
  });

  beforeEach(() => {
    createIncident.mockClear();
    createRequest.mockClear();
    controller = new TicketsController(
      {
        execute: createIncident,
      } as unknown as CreateIncidentUseCase,
      {
        execute: createRequest,
      } as unknown as CreateRequestUseCase,
    );
  });

  it('delegates incident creation to the use case with the authenticated user id', async () => {
    await expect(
      controller.createIncident(
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          categoryId: 'category-1',
          description: 'VPN inaccessible',
          impact: IncidentSeverity.HIGH,
          title: 'VPN KO',
          urgency: IncidentSeverity.MEDIUM,
        },
      ),
    ).resolves.toEqual({
      incident: {
        impact: IncidentSeverity.HIGH,
        urgency: IncidentSeverity.MEDIUM,
      },
      priorityName: 'HIGH',
      ticket: { id: 'ticket-1', number: 'TICK-000001' },
    });

    expect(createIncident).toHaveBeenCalledWith({
      categoryId: 'category-1',
      createdByUserId: 'user-1',
      description: 'VPN inaccessible',
      impact: IncidentSeverity.HIGH,
      title: 'VPN KO',
      urgency: IncidentSeverity.MEDIUM,
    });
  });

  it('delegates request creation to the use case with the authenticated user id', async () => {
    await expect(
      controller.createRequest(
        {
          accessToken: 'token',
          email: 'agent@jarvis.local',
          id: 'user-1',
          role: UserRole.AGENT,
        },
        {
          categoryId: 'category-1',
          description: 'Besoin d un acces VPN',
          priorityId: 'priority-medium',
          requestType: RequestType.ACCESS,
          title: 'Demande accès VPN',
        },
      ),
    ).resolves.toEqual({
      priorityName: 'MEDIUM',
      request: {
        approvalStatus: null,
        fulfilledAt: null,
        requestType: RequestType.ACCESS,
        ticketId: 'ticket-2',
      },
      ticket: { id: 'ticket-2', number: 'TICK-000002' },
    });

    expect(createRequest).toHaveBeenCalledWith({
      categoryId: 'category-1',
      createdByUserId: 'user-1',
      description: 'Besoin d un acces VPN',
      priorityId: 'priority-medium',
      requestType: RequestType.ACCESS,
      title: 'Demande accès VPN',
    });
  });
});
