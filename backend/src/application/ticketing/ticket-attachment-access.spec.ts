import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../domain/auth/user-role';
import { TicketDetail } from '../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../domain/ticketing/ticket-status';
import { Ticket } from '../../domain/ticketing/ticket';
import { TicketType } from '../../domain/ticketing/ticket-type';
import { assertTicketAttachmentAccess } from './ticket-attachment-access';

describe('assertTicketAttachmentAccess', () => {
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
      'beneficiary-1',
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

  it('allows admins', () => {
    expect(() =>
      assertTicketAttachmentAccess({
        ticket,
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
      }),
    ).not.toThrow();
  });

  it('allows demandeur creator access', () => {
    expect(() =>
      assertTicketAttachmentAccess({
        ticket,
        userId: 'creator-1',
        userRole: UserRole.DEMANDEUR,
      }),
    ).not.toThrow();
  });

  it('allows demandeur beneficiary access', () => {
    expect(() =>
      assertTicketAttachmentAccess({
        ticket,
        userId: 'beneficiary-1',
        userRole: UserRole.DEMANDEUR,
      }),
    ).not.toThrow();
  });

  it('rejects demandeur outsider access', () => {
    expect(() =>
      assertTicketAttachmentAccess({
        ticket,
        userId: 'outsider-1',
        userRole: UserRole.DEMANDEUR,
      }),
    ).toThrow(ForbiddenException);
  });
});
