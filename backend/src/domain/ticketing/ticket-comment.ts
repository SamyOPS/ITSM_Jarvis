export class TicketComment {
  constructor(
    readonly id: string,
    readonly ticketId: string,
    readonly authorUserId: string,
    readonly body: string,
    readonly isInternal: boolean,
    readonly createdAt: string,
  ) {}
}
