import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketAttachment } from '../../../domain/ticketing/ticket-attachment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketAttachmentReadRepository } from '../repositories/ticket-attachment-read.repository';
import { TicketAttachmentWriteRepository } from '../repositories/ticket-attachment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { DeleteTicketAttachmentUseCase } from './delete-ticket-attachment.use-case';

describe('DeleteTicketAttachmentUseCase', () => {
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
      null,
      '2026-04-02T08:00:00.000Z',
    ),
    null,
    null,
    null,
  );

  it('allows admins to delete any attachment and writes audit', async () => {
    const deleteTicketAttachment = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new DeleteTicketAttachmentUseCase(
      {
        getTicketAttachmentById: jest
          .fn()
          .mockResolvedValue(
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
          ),
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        addTicketAttachment: jest.fn(),
        deleteTicketAttachment,
      } as TicketAttachmentWriteRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: ' admin-1 ',
        attachmentId: ' attachment-1 ',
        ticketId: ' ticket-1 ',
      }),
    ).resolves.toBeUndefined();

    expect(deleteTicketAttachment).toHaveBeenCalledWith(
      'ticket-1',
      'attachment-1',
    );
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      eventType: TicketHistoryEventType.ATTACHMENT_DELETED,
      payload: {
        attachmentId: 'attachment-1',
        bucketId: 'ticket-attachments',
        fileName: 'test-upload.txt',
        storagePath: 'creator-1/test-upload.txt',
      },
      ticketId: 'ticket-1',
    });
  });

  it('allows demandeur users to delete their own attachment', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new DeleteTicketAttachmentUseCase(
      {
        getTicketAttachmentById: jest
          .fn()
          .mockResolvedValue(
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
          ),
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        addTicketAttachment: jest.fn(),
        deleteTicketAttachment: jest.fn().mockResolvedValue(undefined),
      } as TicketAttachmentWriteRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        write,
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.DEMANDEUR,
        actorUserId: 'creator-1',
        attachmentId: 'attachment-1',
        ticketId: 'ticket-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects empty identifiers', async () => {
    const useCase = new DeleteTicketAttachmentUseCase(
      {
        getTicketAttachmentById: jest.fn(),
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        addTicketAttachment: jest.fn(),
        deleteTicketAttachment: jest.fn(),
      } as TicketAttachmentWriteRepository,
      {
        getTicketById: jest.fn(),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: '   ',
        attachmentId: 'attachment-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown tickets', async () => {
    const useCase = new DeleteTicketAttachmentUseCase(
      {
        getTicketAttachmentById: jest.fn(),
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        addTicketAttachment: jest.fn(),
        deleteTicketAttachment: jest.fn(),
      } as TicketAttachmentWriteRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(null),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        attachmentId: 'attachment-1',
        ticketId: 'ticket-404',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects unknown attachments', async () => {
    const useCase = new DeleteTicketAttachmentUseCase(
      {
        getTicketAttachmentById: jest.fn().mockResolvedValue(null),
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        addTicketAttachment: jest.fn(),
        deleteTicketAttachment: jest.fn(),
      } as TicketAttachmentWriteRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        attachmentId: 'attachment-404',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects demandeur users trying to delete another user attachment', async () => {
    const useCase = new DeleteTicketAttachmentUseCase(
      {
        getTicketAttachmentById: jest
          .fn()
          .mockResolvedValue(
            new TicketAttachment(
              'attachment-1',
              'ticket-1',
              'agent-1',
              'ticket-attachments',
              'agent-1/test-upload.txt',
              'test-upload.txt',
              'text/plain',
              21,
              '2026-04-02T08:10:00.000Z',
            ),
          ),
        listTicketAttachments: jest.fn(),
      } as TicketAttachmentReadRepository,
      {
        addTicketAttachment: jest.fn(),
        deleteTicketAttachment: jest.fn(),
      } as TicketAttachmentWriteRepository,
      {
        getTicketById: jest.fn().mockResolvedValue(ticketDetail),
        searchTickets: jest.fn(),
      } as TicketReadRepository,
      {
        write: jest.fn(),
      } as unknown as TicketAuditService,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.DEMANDEUR,
        actorUserId: 'creator-1',
        attachmentId: 'attachment-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
