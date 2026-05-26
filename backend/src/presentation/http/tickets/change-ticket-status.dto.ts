import { IsEnum } from 'class-validator';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';

export class ChangeTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
