export type KnowledgeArticleStatus = 'DRAFT' | 'PUBLISHED' | 'REJECTED';

export class KnowledgeArticle {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly slug: string,
    public readonly category: string,
    public readonly content: string,
    public readonly status: KnowledgeArticleStatus,
    public readonly createdByUserId: string,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly likesCount: number,
    public readonly likedByMe: boolean,
  ) {}
}
