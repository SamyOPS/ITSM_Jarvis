import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class GetKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(id: string, userRole: UserRole): Promise<KnowledgeArticle> {
    const article = await this.repository.getArticleById(id);

    if (!article) {
      throw new NotFoundException('Knowledge article not found.');
    }

    if (article.status === 'DRAFT' && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Knowledge article access denied.');
    }

    return article;
  }
}
