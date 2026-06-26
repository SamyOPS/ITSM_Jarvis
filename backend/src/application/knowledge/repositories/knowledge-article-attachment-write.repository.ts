import { KnowledgeArticleAttachment } from '../../../domain/knowledge/knowledge-article-attachment';

export type CreateKnowledgeArticleAttachmentRecord = {
  articleId: string;
  bucketId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  storagePath: string;
  uploadedByUserId: string;
};

export abstract class KnowledgeArticleAttachmentWriteRepository {
  abstract addKnowledgeArticleAttachment(
    record: CreateKnowledgeArticleAttachmentRecord,
  ): Promise<KnowledgeArticleAttachment>;

  abstract deleteKnowledgeArticleAttachment(
    articleId: string,
    attachmentId: string,
  ): Promise<void>;
}
