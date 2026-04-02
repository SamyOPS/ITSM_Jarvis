import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { assertTicketCommentAccess } from './ticket-comment-access';

describe('assertTicketCommentAccess', () => {
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
      'requested-1',
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

  it('allows admin users', () => {
    expect(() =>
      assertTicketCommentAccess({
        ticket,
        userId: 'someone-else',
        userRole: UserRole.ADMIN,
      }),
    ).not.toThrow();
  });

  it('allows demandeur creator access', () => {
    expect(() =>
      assertTicketCommentAccess({
        ticket,
        userId: 'creator-1',
        userRole: UserRole.DEMANDEUR,
      }),
    ).not.toThrow();
  });

  it('allows demandeur requested-for access', () => {
    expect(() =>
      assertTicketCommentAccess({
        ticket,
        userId: 'requested-1',
        userRole: UserRole.DEMANDEUR,
      }),
    ).not.toThrow();
  });

  it('rejects demandeur users outside the ticket perimeter', () => {
    expect(() =>
      assertTicketCommentAccess({
        ticket,
        userId: 'outsider-1',
        userRole: UserRole.DEMANDEUR,
      }),
    ).toThrow(ForbiddenException);
  });
});
