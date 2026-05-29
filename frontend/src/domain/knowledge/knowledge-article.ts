export type KnowledgeArticleStatus = 'DRAFT' | 'PUBLISHED';

export type KnowledgeArticle = {
  category: string;
  content: string;
  createdAt: string;
  createdByUserId: string;
  id: string;
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
