import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';
import { GetKnowledgeArticleUseCase } from './get-knowledge-article.use-case';

@Injectable()
export class ToggleKnowledgeArticleLikeUseCase {
  constructor(
    private readonly repository: KnowledgeArticleRepository,
    private readonly getKnowledgeArticleUseCase: GetKnowledgeArticleUseCase,
  ) {}

  async execute(
    articleId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<KnowledgeArticle> {
    await this.getKnowledgeArticleUseCase.execute(articleId, userRole, userId);

    return this.repository.toggleArticleLike(articleId, userId);
  }
}
