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
import { TicketAttachmentWriteRepository } from '../repositories/ticket-attachment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { AddTicketAttachmentUseCase } from './add-ticket-attachment.use-case';

describe('AddTicketAttachmentUseCase', () => {
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

  it('registers attachment metadata for a demandeur on an allowed ticket and writes audit', async () => {
    const addTicketAttachment = jest
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
      );
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new AddTicketAttachmentUseCase(
      {
        addTicketAttachment,
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
        bucketId: ' ticket-attachments ',
        fileName: ' test-upload.txt ',
        mimeType: ' text/plain ',
        sizeBytes: 21,
        storagePath: ' creator-1/test-upload.txt ',
        ticketId: ' ticket-1 ',
        uploaderRole: UserRole.DEMANDEUR,
        uploaderUserId: ' creator-1 ',
      }),
    ).resolves.toEqual(
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
    );

    expect(addTicketAttachment).toHaveBeenCalledWith({
      bucketId: 'ticket-attachments',
      fileName: 'test-upload.txt',
      mimeType: 'text/plain',
      sizeBytes: 21,
      storagePath: 'creator-1/test-upload.txt',
      ticketId: 'ticket-1',
      uploadedByUserId: 'creator-1',
    });
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'creator-1',
      eventType: TicketHistoryEventType.ATTACHMENT_ADDED,
      payload: {
        attachmentId: 'attachment-1',
        bucketId: 'ticket-attachments',
        fileName: 'test-upload.txt',
        sizeBytes: 21,
        storagePath: 'creator-1/test-upload.txt',
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects unknown tickets', async () => {
    const useCase = new AddTicketAttachmentUseCase(
      {
        addTicketAttachment: jest.fn(),
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
        bucketId: 'ticket-attachments',
        fileName: 'test-upload.txt',
        sizeBytes: 21,
        storagePath: 'creator-1/test-upload.txt',
        ticketId: 'ticket-404',
        uploaderRole: UserRole.AGENT,
        uploaderUserId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects demandeur users outside the ticket perimeter', async () => {
    const useCase = new AddTicketAttachmentUseCase(
      {
        addTicketAttachment: jest.fn(),
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
        bucketId: 'ticket-attachments',
        fileName: 'test-upload.txt',
        sizeBytes: 21,
        storagePath: 'creator-1/test-upload.txt',
        ticketId: 'ticket-1',
        uploaderRole: UserRole.DEMANDEUR,
        uploaderUserId: 'outsider-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an empty storage path', async () => {
    const useCase = new AddTicketAttachmentUseCase(
      {
        addTicketAttachment: jest.fn(),
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
        bucketId: 'ticket-attachments',
        fileName: 'test-upload.txt',
        sizeBytes: 21,
        storagePath: '   ',
        ticketId: 'ticket-1',
        uploaderRole: UserRole.AGENT,
        uploaderUserId: 'agent-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a negative file size', async () => {
    const useCase = new AddTicketAttachmentUseCase(
      {
        addTicketAttachment: jest.fn(),
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
        bucketId: 'ticket-attachments',
        fileName: 'test-upload.txt',
        sizeBytes: -1,
        storagePath: 'creator-1/test-upload.txt',
        ticketId: 'ticket-1',
        uploaderRole: UserRole.AGENT,
        uploaderUserId: 'agent-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
