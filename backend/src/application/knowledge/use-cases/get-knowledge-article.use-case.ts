import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class GetKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(
    id: string,
    userRole: UserRole,
    currentUserId: string,
  ): Promise<KnowledgeArticle> {
    const article = await this.repository.getArticleById(id, currentUserId);

    if (!article) {
      throw new NotFoundException('Knowledge article not found.');
    }

    if (article.status === 'DRAFT' && !isAdminRole(userRole)) {
      throw new ForbiddenException('Knowledge article access denied.');
    }

    return article;
  }
}
