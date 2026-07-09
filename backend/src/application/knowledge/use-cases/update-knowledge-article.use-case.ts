import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import {
  type KnowledgeArticleInput,
  validateKnowledgeArticleInput,
} from '../knowledge-article.validation';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class UpdateKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(
    id: string,
    currentUserId: string,
    userRole: UserRole,
    input: KnowledgeArticleInput,
  ): Promise<KnowledgeArticle> {
    const existing = await this.repository.getArticleById(id, currentUserId);

    if (!existing) {
      throw new NotFoundException('Knowledge article not found.');
    }

    if (!isAdminRole(userRole)) {
      if (
        existing.createdByUserId !== currentUserId ||
        existing.status === 'PUBLISHED'
      ) {
        throw new ForbiddenException('Knowledge article update denied.');
      }
    }

    const { category, content, status, title } =
      validateKnowledgeArticleInput(input);

    return this.repository.updateArticle(id, currentUserId, {
      category,
      content,
      status: isAdminRole(userRole) ? status : 'DRAFT',
      title,
    });
  }
}
