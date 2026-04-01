import { TicketStatus } from '../../../domain/ticketing/ticket-status';

export type ChangeTicketStatusDto = {
  status: TicketStatus;
};
