import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isSupportRole, UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class GetKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(
    id: string,
    userRole: UserRole,
    currentUserId: string,
    canReviewArticles = false,
  ): Promise<KnowledgeArticle> {
    const article = await this.repository.getArticleById(id, currentUserId);

    if (!article) {
      throw new NotFoundException('Knowledge article not found.');
    }

    if (
      article.status !== 'PUBLISHED' &&
      !canReviewArticles &&
      (!isSupportRole(userRole) || article.createdByUserId !== currentUserId)
    ) {
      throw new ForbiddenException('Knowledge article access denied.');
    }

    return article;
  }
}
