import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticleAttachment } from '../../../domain/knowledge/knowledge-article-attachment';
import { KnowledgeArticleAttachmentReadRepository } from '../repositories/knowledge-article-attachment-read.repository';
import { GetKnowledgeArticleUseCase } from './get-knowledge-article.use-case';

@Injectable()
export class ListKnowledgeArticleAttachmentsUseCase {
  constructor(
    @Inject(KnowledgeArticleAttachmentReadRepository)
    private readonly knowledgeArticleAttachmentReadRepository: KnowledgeArticleAttachmentReadRepository,
    private readonly getKnowledgeArticleUseCase: GetKnowledgeArticleUseCase,
  ) {}

  async execute(
    articleId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<KnowledgeArticleAttachment[]> {
    const normalizedArticleId = articleId.trim();
    const normalizedUserId = userId.trim();

    if (!normalizedArticleId) {
      throw new BadRequestException('articleId is required.');
    }

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    await this.getKnowledgeArticleUseCase.execute(
      normalizedArticleId,
      userRole,
      normalizedUserId,
    );

    return this.knowledgeArticleAttachmentReadRepository.listKnowledgeArticleAttachments(
      {
        articleId: normalizedArticleId,
      },
    );
  }
}
