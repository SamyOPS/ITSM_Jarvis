import { TicketComment } from '../../../domain/ticketing/ticket-comment';

export type CreateTicketCommentRecord = {
  authorUserId: string;
  body: string;
  isInternal: boolean;
  ticketId: string;
};

export abstract class TicketCommentWriteRepository {
  abstract addTicketComment(
    record: CreateTicketCommentRecord,
  ): Promise<TicketComment>;
}
