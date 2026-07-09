import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { type KnowledgeArticleStatus } from '../../../domain/knowledge/knowledge-article';

export type CreateKnowledgeArticleRecord = {
  category: string;
  content: string;
  createdByUserId: string;
  slug: string;
  status: KnowledgeArticleStatus;
  title: string;
};

export type UpdateKnowledgeArticleRecord = {
  category: string;
  content: string;
  status: KnowledgeArticleStatus;
  title: string;
};

export abstract class KnowledgeArticleRepository {
  abstract createArticle(
    command: CreateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle>;

  abstract updateArticle(
    id: string,
    currentUserId: string,
    command: UpdateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle>;

  abstract deleteArticle(id: string): Promise<void>;

  abstract getArticleById(
    id: string,
    currentUserId: string,
  ): Promise<KnowledgeArticle | null>;

  abstract listArticles(currentUserId: string): Promise<KnowledgeArticle[]>;

  abstract listPublishedArticles(
    currentUserId: string,
  ): Promise<KnowledgeArticle[]>;

  abstract toggleArticleLike(
    articleId: string,
    userId: string,
  ): Promise<KnowledgeArticle>;
}
