import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketAttachmentReadRepository } from '../repositories/ticket-attachment-read.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { ListTicketAttachmentsUseCase } from './list-ticket-attachments.use-case';

describe('ListTicketAttachmentsUseCase', () => {
  const ticketDetail = new TicketDetail(
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

  it('lists attachments for a demandeur on an allowed ticket', async () => {
    const listTicketAttachments = jest
      .fn()
      .mockResolvedValue([
        new TicketAttachment(
          'attachment-1',
          'ticket-1',
          'creator-1',
          'ticket-attachments',
          'creator-1/test-upload.txt',
          'test-upload.txt',
          'text/plain',
          21,
          '2026-04-02T08:10:00.000Z',
        ),
      ]);
    const useCase = new ListTicketAttachmentsUseCase(
      {
        listTicketAttachments,
      } as TicketAttachmentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute(' ticket-1 ', 'creator-1', UserRole.DEMANDEUR),
    ).resolves.toEqual([
      new TicketAttachment(
        'attachment-1',
        'ticket-1',
        'creator-1',
        'ticket-attachments',
        'creator-1/test-upload.txt',
        'test-upload.txt',
        'text/plain',
        21,
        '2026-04-02T08:10:00.000Z',
      ),
    ]);

    expect(listTicketAttachments).toHaveBeenCalledWith({
      ticketId: 'ticket-1',
    });
  });

  it('rejects an empty ticket id', async () => {
    const useCase = new ListTicketAttachmentsUseCase(
      {
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('   ', 'admin-1', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty user id', async () => {
    const useCase = new ListTicketAttachmentsUseCase(
      {
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('ticket-1', '   ', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects demandeur users outside the ticket perimeter', async () => {
    const useCase = new ListTicketAttachmentsUseCase(
      {
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('ticket-1', 'outsider-1', UserRole.DEMANDEUR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unknown tickets', async () => {
    const useCase = new ListTicketAttachmentsUseCase(
      {
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(null),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
    );

    await expect(
      useCase.execute('ticket-404', 'admin-1', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
