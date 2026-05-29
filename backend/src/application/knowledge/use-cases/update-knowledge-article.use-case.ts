import { Injectable, NotFoundException } from '@nestjs/common';
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
    input: KnowledgeArticleInput,
  ): Promise<KnowledgeArticle> {
    const existing = await this.repository.getArticleById(id);

    if (!existing) {
      throw new NotFoundException('Knowledge article not found.');
    }

    const { category, content, status, title } =
      validateKnowledgeArticleInput(input);

    return this.repository.updateArticle(id, {
      category,
      content,
      status,
      title,
    });
  }
}
