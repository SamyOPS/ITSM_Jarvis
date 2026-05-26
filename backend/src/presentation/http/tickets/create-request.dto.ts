import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RequestType } from '../../../domain/ticketing/request-type';

export class CreateRequestDto {
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

  @IsString()
  @IsNotEmpty()
  priorityId!: string;

  @IsOptional()
  @IsString()
  requestedForUserId?: string | null;

  @IsOptional()
  @IsEnum(RequestType)
  requestType?: RequestType | null;

  @IsString()
  @IsNotEmpty()
  title!: string;
}
