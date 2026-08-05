import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketComment } from '../../../domain/ticketing/ticket-comment';
import { TicketDetail } from '../../../domain/ticketing/ticket-detail';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { Ticket } from '../../../domain/ticketing/ticket';
import { TicketHistoryEventType } from '../../../domain/ticketing/ticket-history-event-type';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { TicketCommentReadRepository } from '../repositories/ticket-comment-read.repository';
import { TicketCommentWriteRepository } from '../repositories/ticket-comment-write.repository';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketAuditService } from '../ticket-audit.service';
import { DeleteTicketCommentUseCase } from './delete-ticket-comment.use-case';

describe('DeleteTicketCommentUseCase', () => {
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

  it('allows admins to delete any comment', async () => {
    const deleteTicketComment = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new DeleteTicketCommentUseCase(
      {
        getTicketCommentById: jest
          .fn()
          .mockResolvedValue(
            new TicketComment(
              'comment-1',
              'ticket-1',
              'creator-1',
              'Commentaire',
              false,
              '2026-04-02T08:10:00.000Z',
            ),
          ),
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        addTicketComment: jest.fn(),
        deleteTicketComment,
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
        actorRole: UserRole.ADMIN,
        actorUserId: ' admin-1 ',
        commentId: ' comment-1 ',
        ticketId: ' ticket-1 ',
      }),
    ).resolves.toBeUndefined();

    expect(deleteTicketComment).toHaveBeenCalledWith('ticket-1', 'comment-1');
    expect(write).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      eventType: TicketHistoryEventType.COMMENT_DELETED,
      payload: {
        authorUserId: 'creator-1',
        commentId: 'comment-1',
      },
      ticketId: 'ticket-1',
    });
  });

  it('allows demandeur users to delete their own comment', async () => {
    const deleteTicketComment = jest.fn().mockResolvedValue(undefined);
    const write = jest.fn().mockResolvedValue(undefined);
    const useCase = new DeleteTicketCommentUseCase(
      {
        getTicketCommentById: jest
          .fn()
          .mockResolvedValue(
            new TicketComment(
              'comment-1',
              'ticket-1',
              'creator-1',
              'Mon commentaire',
              false,
              '2026-04-02T08:10:00.000Z',
            ),
          ),
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        addTicketComment: jest.fn(),
        deleteTicketComment,
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
        actorRole: UserRole.DEMANDEUR,
        actorUserId: 'creator-1',
        commentId: 'comment-1',
        ticketId: 'ticket-1',
      }),
    ).resolves.toBeUndefined();

    expect(write).toHaveBeenCalledWith({
      actorUserId: 'creator-1',
      eventType: TicketHistoryEventType.COMMENT_DELETED,
      payload: {
        authorUserId: 'creator-1',
        commentId: 'comment-1',
      },
      ticketId: 'ticket-1',
    });
  });

  it('rejects empty identifiers', async () => {
    const useCase = new DeleteTicketCommentUseCase(
      {
        getTicketCommentById: jest.fn(),
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        addTicketComment: jest.fn(),
        deleteTicketComment: jest.fn(),
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
        actorRole: UserRole.AGENT,
        actorUserId: '   ',
        commentId: 'comment-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown tickets', async () => {
    const useCase = new DeleteTicketCommentUseCase(
      {
        getTicketCommentById: jest.fn(),
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        addTicketComment: jest.fn(),
        deleteTicketComment: jest.fn(),
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
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        commentId: 'comment-1',
        ticketId: 'ticket-404',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects unknown comments', async () => {
    const useCase = new DeleteTicketCommentUseCase(
      {
        getTicketCommentById: jest.fn().mockResolvedValue(null),
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        addTicketComment: jest.fn(),
        deleteTicketComment: jest.fn(),
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
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        commentId: 'comment-404',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects demandeur users trying to delete another user comment', async () => {
    const useCase = new DeleteTicketCommentUseCase(
      {
        getTicketCommentById: jest
          .fn()
          .mockResolvedValue(
            new TicketComment(
              'comment-1',
              'ticket-1',
              'agent-1',
              'Commentaire support',
              false,
              '2026-04-02T08:10:00.000Z',
            ),
          ),
        listTicketComments: jest.fn(),
      } as TicketCommentReadRepository,
      {
        addTicketComment: jest.fn(),
        deleteTicketComment: jest.fn(),
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
        actorRole: UserRole.DEMANDEUR,
        actorUserId: 'creator-1',
        commentId: 'comment-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
