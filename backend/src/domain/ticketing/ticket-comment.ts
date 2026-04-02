export class TicketComment {
  constructor(
    public readonly id: string,
    public readonly ticketId: string,
    public readonly authorUserId: string,
    public readonly body: string,
    public readonly isInternal: boolean,
    public readonly createdAt: string,
  ) {}
}
