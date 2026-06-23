import { Injectable } from '@nestjs/common';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class ToggleKnowledgeArticleLikeUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  execute(articleId: string, userId: string): Promise<KnowledgeArticle> {
    return this.repository.toggleArticleLike(articleId, userId);
  }
}
