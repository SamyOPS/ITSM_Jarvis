export type KnowledgeArticleStatus = 'DRAFT' | 'PUBLISHED' | 'REJECTED';

export type KnowledgeArticle = {
  category: string;
  content: string;
  createdAt: string;
  createdByUserId: string;
  id: string;
  likedByMe: boolean;
  likesCount: number;
  slug: string;
  status: KnowledgeArticleStatus;
  title: string;
  updatedAt: string;
};

export type CreateKnowledgeArticlePayload = {
  category: string;
  content: string;
  status: KnowledgeArticleStatus;
  title: string;
};

export type UpdateKnowledgeArticlePayload = {
  category: string;
  content: string;
  status: KnowledgeArticleStatus;
  title: string;
};
