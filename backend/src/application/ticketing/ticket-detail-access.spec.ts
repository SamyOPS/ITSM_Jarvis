import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { assertTicketDetailAccess } from './ticket-detail-access';

describe('assertTicketDetailAccess', () => {
  it('allows an agent assigned directly to the ticket', () => {
    const ticket = new TicketDetail(
      new Ticket(
        'ticket-1',
        'TICK-000001',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        'agent-1',
        'group-1',
        null,
        null,
        '2026-04-02T08:00:00.000Z',
      ),
      null,
      null,
      null,
    );

    expect(() =>
      assertTicketDetailAccess({
        ticket,
        userId: 'agent-1',
        userRole: UserRole.AGENT,
      }),
    ).not.toThrow();
  });

  it('allows an agent in the assignment group', () => {
    const ticket = new TicketDetail(
      new Ticket(
        'ticket-2',
        'TICK-000002',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        'group-2',
        null,
        null,
        '2026-04-02T08:00:00.000Z',
      ),
      null,
      null,
      null,
    );

    expect(() =>
      assertTicketDetailAccess({
        ticket,
        userId: 'agent-1',
        userProfile: {
          groupId: 'group-2',
          groupIds: ['group-2', 'group-3'],
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        },
        userRole: UserRole.AGENT,
      }),
    ).not.toThrow();
  });

  it('allows an agent to access an unassigned ticket', () => {
    const ticket = new TicketDetail(
      new Ticket(
        'ticket-3',
        'TICK-000003',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        null,
        null,
        null,
        '2026-04-02T08:00:00.000Z',
      ),
      null,
      null,
      null,
    );

    expect(() =>
      assertTicketDetailAccess({
        ticket,
        userId: 'agent-1',
        userRole: UserRole.AGENT,
      }),
    ).not.toThrow();
  });

  it('rejects an agent outside the assignment group', () => {
    const ticket = new TicketDetail(
      new Ticket(
        'ticket-4',
        'TICK-000004',
        TicketType.INCIDENT,
        TicketStatus.OPEN,
        'VPN KO',
        'Impossible de se connecter',
        'priority-1',
        'category-1',
        'creator-1',
        null,
        null,
        'group-9',
        null,
        null,
        '2026-04-02T08:00:00.000Z',
      ),
      null,
      null,
      null,
    );

    expect(() =>
      assertTicketDetailAccess({
        ticket,
        userId: 'agent-1',
        userProfile: {
          groupId: 'group-2',
          groupIds: ['group-2', 'group-3'],
          id: 'agent-1',
          isActive: true,
          role: UserRole.AGENT,
        },
        userRole: UserRole.AGENT,
      }),
    ).toThrow(ForbiddenException);
  });
});
