import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';

export type CreateKnowledgeArticleRecord = {
  category: string;
  content: string;
  createdByUserId: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
};

export abstract class KnowledgeArticleRepository {
  abstract createArticle(
    command: CreateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle>;

  abstract getArticleById(id: string): Promise<KnowledgeArticle | null>;

  abstract listArticles(): Promise<KnowledgeArticle[]>;

  abstract listPublishedArticles(): Promise<KnowledgeArticle[]>;
}
