import { Injectable } from '@nestjs/common';
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
  ): Promise<KnowledgeArticle> {
    const validatedInput = validateKnowledgeArticleInput(input);

    return this.repository.createArticle({
      ...validatedInput,
      createdByUserId: userId,
    });
  }
}
