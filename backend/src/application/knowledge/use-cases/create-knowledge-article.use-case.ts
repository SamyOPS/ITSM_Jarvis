import { Injectable } from '@nestjs/common';
import { isSupportManagerRole, UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import {
  type KnowledgeArticleInput,
  validateKnowledgeArticleInput,
} from '../knowledge-article.validation';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class CreateKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  execute(
    input: KnowledgeArticleInput,
    userId: string,
    userRole: UserRole,
  ): Promise<KnowledgeArticle> {
    const validatedInput = validateKnowledgeArticleInput(input);
    const status = isSupportManagerRole(userRole)
      ? validatedInput.status
      : 'DRAFT';

    return this.repository.createArticle({
      ...validatedInput,
      status,
      createdByUserId: userId,
    });
  }
}
