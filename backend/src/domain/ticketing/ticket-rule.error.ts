export class TicketRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketRuleError';
  }
}
