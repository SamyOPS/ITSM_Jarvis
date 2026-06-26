import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddKnowledgeArticleAttachmentDto {
  @IsString()
  @IsNotEmpty()
  bucketId!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsOptional()
  @IsString()
  mimeType?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @IsString()
  @IsNotEmpty()
  storagePath!: string;
}
