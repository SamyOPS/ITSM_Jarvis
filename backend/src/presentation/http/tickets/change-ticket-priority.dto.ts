import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeTicketPriorityDto {
  @IsString()
  @IsNotEmpty()
  priorityId!: string;
}
