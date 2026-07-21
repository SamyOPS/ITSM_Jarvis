import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
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
  equipments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorities?: string[];

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  userInput!: string;
}
