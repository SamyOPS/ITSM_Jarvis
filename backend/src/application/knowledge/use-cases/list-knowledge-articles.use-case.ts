import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class ListKnowledgeArticlesUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  execute(userRole: UserRole, currentUserId: string): Promise<KnowledgeArticle[]> {
    if (userRole === UserRole.ADMIN) {
      return this.repository.listArticles(currentUserId);
    }

    return this.repository.listPublishedArticles(currentUserId);
  }
}
