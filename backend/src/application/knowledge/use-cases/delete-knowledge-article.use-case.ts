import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeArticleRepository } from '../repositories/knowledge-article.repository';

@Injectable()
export class DeleteKnowledgeArticleUseCase {
  constructor(private readonly repository: KnowledgeArticleRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.getArticleById(id, '');

    if (!existing) {
      throw new NotFoundException('Knowledge article not found.');
    }

    return this.repository.deleteArticle(id);
  }
}
