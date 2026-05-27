import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';

export class CreateIncidentDto {
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

  @IsEnum(IncidentSeverity)
  impact!: IncidentSeverity;

  @IsOptional()
  @IsString()
  requestedForUserId?: string | null;

  @IsOptional()
  @IsString()
  rootCause?: string | null;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(IncidentSeverity)
  urgency!: IncidentSeverity;

  @IsOptional()
  @IsString()
  workaround?: string | null;
}
