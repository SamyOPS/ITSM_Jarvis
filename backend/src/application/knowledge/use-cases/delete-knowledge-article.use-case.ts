import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class DeleteKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(
    id: string,
    currentUserId: string,
    userRole: UserRole,
  ): Promise<void> {
    const existing = await this.repository.getArticleById(id, currentUserId);

    if (!existing) {
      throw new NotFoundException('Knowledge article not found.');
    }

    if (
      !isAdminRole(userRole) &&
      (existing.createdByUserId !== currentUserId ||
        existing.status === 'PUBLISHED')
    ) {
      throw new ForbiddenException('Knowledge article deletion denied.');
    }

    return this.repository.deleteArticle(id);
  }
}
