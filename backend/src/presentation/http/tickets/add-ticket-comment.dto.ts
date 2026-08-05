import { IsNotEmpty, IsString } from 'class-validator';

export class AddTicketCommentDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}
