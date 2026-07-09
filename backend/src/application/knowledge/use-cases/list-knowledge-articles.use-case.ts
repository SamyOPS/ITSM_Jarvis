import { Injectable } from '@nestjs/common';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class ListKnowledgeArticlesUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(
    userRole: UserRole,
    currentUserId: string,
  ): Promise<KnowledgeArticle[]> {
    if (isAdminRole(userRole)) {
      return this.repository.listArticles(currentUserId);
    }

    const articles = await this.repository.listArticles(currentUserId);

    return articles.filter(
      (article) =>
        article.status === 'PUBLISHED' ||
        (userRole === UserRole.AGENT &&
          article.createdByUserId === currentUserId),
    );
  }
}
