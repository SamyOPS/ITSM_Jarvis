import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { UserRole } from '../../../domain/auth/user-role';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;
  const execute = jest.fn().mockResolvedValue({
    incident: {
      impact: IncidentSeverity.HIGH,
      urgency: IncidentSeverity.MEDIUM,
    },
    priorityName: 'HIGH',
    ticket: { id: 'ticket-1', number: 'TICK-000001' },
  });

  beforeEach(() => {
    execute.mockClear();
    controller = new TicketsController({
      execute,
    } as unknown as CreateIncidentUseCase);
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

    expect(execute).toHaveBeenCalledWith({
      categoryId: 'category-1',
      createdByUserId: 'user-1',
      description: 'VPN inaccessible',
      impact: IncidentSeverity.HIGH,
      title: 'VPN KO',
      urgency: IncidentSeverity.MEDIUM,
    });
  });
});
