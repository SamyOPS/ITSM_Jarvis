export class KnowledgeArticleAttachment {
  constructor(
    public readonly id: string,
    public readonly articleId: string,
    public readonly uploadedByUserId: string,
    public readonly bucketId: string,
    public readonly storagePath: string,
    public readonly fileName: string,
    public readonly mimeType: string | null,
    public readonly sizeBytes: number,
    public readonly createdAt: string,
  ) {}
}
