import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';

export type CreateKnowledgeArticleRecord = {
  category: string;
  content: string;
  createdByUserId: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
};

export type UpdateKnowledgeArticleRecord = {
  category: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
};

export abstract class KnowledgeArticleRepository {
  abstract createArticle(
    command: CreateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle>;

  abstract updateArticle(
    id: string,
    command: UpdateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle>;

  abstract deleteArticle(id: string): Promise<void>;

  abstract getArticleById(id: string): Promise<KnowledgeArticle | null>;

  abstract listArticles(): Promise<KnowledgeArticle[]>;

  abstract listPublishedArticles(): Promise<KnowledgeArticle[]>;
}
