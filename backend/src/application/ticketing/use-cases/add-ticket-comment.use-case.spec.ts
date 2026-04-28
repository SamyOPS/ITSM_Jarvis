import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketCommentWriteRepository } from '../repositories/ticket-comment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { AddTicketCommentUseCase } from './add-ticket-comment.use-case';

describe('AddTicketCommentUseCase', () => {
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

  it('creates a public comment for a demandeur and writes audit', async () => {
    const addTicketComment = jest
      .fn()
      .mockResolvedValue(
        new TicketComment(
          'comment-1',
          'ticket-1',
          'creator-1',
          'Commentaire public',
          false,
          '2026-04-02T08:10:00.000Z',
        ),
      );
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new AddTicketCommentUseCase(
      {
        addTicketComment,
      } as TicketCommentWriteRepository,
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
        authorRole: UserRole.DEMANDEUR,
        authorUserId: ' creator-1 ',
        body: ' Commentaire public ',
        ticketId: ' ticket-1 ',
      }),
    ).resolves.toEqual(
      new TicketComment(
        'comment-1',
        'ticket-1',
        'creator-1',
        'Commentaire public',
        false,
        '2026-04-02T08:10:00.000Z',
      ),
    );

    expect(addTicketComment).toHaveBeenCalledWith({
      authorUserId: 'creator-1',
      body: 'Commentaire public',
      isInternal: false,
      ticketId: 'ticket-1',
    });
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'creator-1',
      eventType: TicketHistoryEventType.COMMENT_ADDED,
      payload: {
        commentId: 'comment-1',
        isInternal: false,
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects internal comments for demandeur users', async () => {
    const useCase = new AddTicketCommentUseCase(
      {
        addTicketComment: jest.fn(),
      } as TicketCommentWriteRepository,
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
        authorRole: UserRole.DEMANDEUR,
        authorUserId: 'creator-1',
        body: 'Interne',
        isInternal: true,
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an empty body', async () => {
    const useCase = new AddTicketCommentUseCase(
      {
        addTicketComment: jest.fn(),
      } as TicketCommentWriteRepository,
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
        authorRole: UserRole.AGENT,
        authorUserId: 'user-1',
        body: '   ',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown tickets', async () => {
    const useCase = new AddTicketCommentUseCase(
      {
        addTicketComment: jest.fn(),
      } as TicketCommentWriteRepository,
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
        authorRole: UserRole.AGENT,
        authorUserId: 'user-1',
        body: 'Commentaire',
        ticketId: 'ticket-404',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects demandeur users outside the ticket perimeter', async () => {
    const useCase = new AddTicketCommentUseCase(
      {
        addTicketComment: jest.fn(),
      } as TicketCommentWriteRepository,
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
        authorRole: UserRole.DEMANDEUR,
        authorUserId: 'outsider-1',
        body: 'Commentaire',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
