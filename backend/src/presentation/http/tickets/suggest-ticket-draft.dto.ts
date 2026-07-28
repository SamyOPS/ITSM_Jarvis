import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export class SuggestTicketDraftDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsEnum(TicketType)
  currentMode?: TicketType | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorities?: string[];

  @IsString()
  userInput!: string;
}
