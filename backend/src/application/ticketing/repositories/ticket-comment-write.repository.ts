import { TicketComment } from '../../../domain/ticketing/ticket-comment';

export type CreateTicketCommentRecord = {
  authorUserId: string;
  body: string;
  ticketId: string;
};

export abstract class TicketCommentWriteRepository {
  abstract addTicketComment(
    record: CreateTicketCommentRecord,
  ): Promise<TicketComment>;

  abstract deleteTicketComment(
    ticketId: string,
    commentId: string,
  ): Promise<void>;
}
