import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddTicketCommentDto {
  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
