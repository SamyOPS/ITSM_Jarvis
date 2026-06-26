import { KnowledgeArticleAttachment } from '../../../domain/knowledge/knowledge-article-attachment';

export type ListKnowledgeArticleAttachmentsFilters = {
  articleId: string;
};

export abstract class KnowledgeArticleAttachmentReadRepository {
  abstract getKnowledgeArticleAttachmentById(
    articleId: string,
    attachmentId: string,
  ): Promise<KnowledgeArticleAttachment | null>;

  abstract listKnowledgeArticleAttachments(
    filters: ListKnowledgeArticleAttachmentsFilters,
  ): Promise<KnowledgeArticleAttachment[]>;
}
