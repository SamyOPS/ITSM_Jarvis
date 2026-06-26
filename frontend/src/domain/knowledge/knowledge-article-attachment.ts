export type KnowledgeArticleAttachmentSnapshot = {
  articleId: string;
  bucketId: string;
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string | null;
  sizeBytes: number;
  storagePath: string;
  uploadedByUserId: string;
};
