import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export class SuggestTicketDraftDto {
  @IsOptional()
  @IsString()
  payload?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsEnum(TicketType)
  currentMode?: TicketType | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requesters?: string[];

  @IsOptional()
  @IsString()
  userInput?: string;
}
