import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';

export class UpdateTicketDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsString()
  channelId?: string | null;

  @IsOptional()
  @IsString()
  ciId?: string | null;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  impact?: IncidentSeverity | null;

  @IsOptional()
  @IsString()
  requestedForUserId?: string | null;

  @IsOptional()
  @IsString()
  rootCause?: string | null;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  urgency?: IncidentSeverity | null;

  @IsOptional()
  @IsString()
  workaround?: string | null;
}
