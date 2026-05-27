import { IsOptional, IsString } from 'class-validator';

export class AssignTicketDto {
  @IsOptional()
  @IsString()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsString()
  assignmentGroupId?: string | null;
}
