import { SlaIndicator } from '../../domain/ticketing/sla-indicator';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { calculateTicketSlaStatus } from './sla-status';

describe('calculateTicketSlaStatus', () => {
  it('returns OK when enough SLA time remains', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-13T11:00:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.OK,
      responseSlaStatus: SlaIndicator.OK,
    });
  });

  it('returns AT_RISK when 25% or less of the SLA remains', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-13T13:15:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.OK,
      responseSlaStatus: SlaIndicator.AT_RISK,
    });
  });

  it('returns OVERDUE when the SLA due date is passed', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.OPEN,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-13T14:01:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.OK,
      responseSlaStatus: SlaIndicator.OVERDUE,
    });
  });

  it('marks response SLA as OK once the ticket leaves OPEN', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.IN_PROGRESS,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-13T15:00:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.OK,
      responseSlaStatus: SlaIndicator.OK,
    });
  });

  it('marks resolution SLA as OK once the ticket is resolved', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.RESOLVED,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-13T19:00:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.OK,
      responseSlaStatus: SlaIndicator.OK,
    });
  });

  it('keeps a paused ticket overdue when it was already late at pause time', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.PENDING,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
      null,
      null,
      null,
      '2026-04-13T18:30:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-14T12:00:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.OVERDUE,
      responseSlaStatus: SlaIndicator.OK,
    });
  });

  it('does not mark a paused ticket overdue while it was still before its due date at pause time', () => {
    const ticket = new Ticket(
      'ticket-1',
      'TICK-000001',
      TicketType.INCIDENT,
      TicketStatus.PENDING,
      'VPN KO',
      'VPN inaccessible',
      'priority-1',
      'category-1',
      'user-1',
      null,
      null,
      null,
      null,
      null,
      '2026-04-13T10:00:00.000Z',
      '2026-04-13T14:00:00.000Z',
      '2026-04-13T18:00:00.000Z',
      null,
      null,
      null,
      '2026-04-13T16:00:00.000Z',
    );

    expect(
      calculateTicketSlaStatus(ticket, new Date('2026-04-14T12:00:00.000Z')),
    ).toEqual({
      resolutionSlaStatus: SlaIndicator.AT_RISK,
      responseSlaStatus: SlaIndicator.OK,
    });
  });
});
