import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticleAttachment } from '../../../domain/knowledge/knowledge-article-attachment';
import { KnowledgeArticleAttachmentWriteRepository } from '../repositories/knowledge-article-attachment-write.repository';
import { GetKnowledgeArticleUseCase } from './get-knowledge-article.use-case';

export type AddKnowledgeArticleAttachmentCommand = {
  articleId: string;
  bucketId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  storagePath: string;
  uploaderRole: UserRole;
  uploaderUserId: string;
};

@Injectable()
export class AddKnowledgeArticleAttachmentUseCase {
  constructor(
    @Inject(KnowledgeArticleAttachmentWriteRepository)
    private readonly knowledgeArticleAttachmentWriteRepository: KnowledgeArticleAttachmentWriteRepository,
    private readonly getKnowledgeArticleUseCase: GetKnowledgeArticleUseCase,
  ) {}

  async execute(
    command: AddKnowledgeArticleAttachmentCommand,
  ): Promise<KnowledgeArticleAttachment> {
    const normalizedArticleId = command.articleId.trim();
    const normalizedUploaderUserId = command.uploaderUserId.trim();
    const normalizedBucketId = command.bucketId.trim();
    const normalizedStoragePath = command.storagePath.trim();
    const normalizedFileName = command.fileName.trim();
    const normalizedMimeType = command.mimeType?.trim() || null;

    if (!normalizedArticleId) {
      throw new BadRequestException('articleId is required.');
    }

    if (!normalizedUploaderUserId) {
      throw new BadRequestException('uploaderUserId is required.');
    }

    if (!normalizedBucketId) {
      throw new BadRequestException('bucketId is required.');
    }

    if (!normalizedStoragePath) {
      throw new BadRequestException('storagePath is required.');
    }

    if (!normalizedFileName) {
      throw new BadRequestException('fileName is required.');
    }

    if (!Number.isInteger(command.sizeBytes) || command.sizeBytes < 0) {
      throw new BadRequestException(
        'sizeBytes must be a non-negative integer.',
      );
    }

    await this.getKnowledgeArticleUseCase.execute(
      normalizedArticleId,
      command.uploaderRole,
      normalizedUploaderUserId,
    );

    return this.knowledgeArticleAttachmentWriteRepository.addKnowledgeArticleAttachment(
      {
        articleId: normalizedArticleId,
        bucketId: normalizedBucketId,
        fileName: normalizedFileName,
        mimeType: normalizedMimeType,
        sizeBytes: command.sizeBytes,
        storagePath: normalizedStoragePath,
        uploadedByUserId: normalizedUploaderUserId,
      },
    );
  }
}
