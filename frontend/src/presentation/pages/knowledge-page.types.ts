import type { KnowledgeArticleStatus } from '../../domain/knowledge/knowledge-article';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { KnowledgeArticleAttachmentSnapshot } from '../../domain/knowledge/knowledge-article-attachment';

export type KnowledgePageProps = {
  articleId?: string;
  mode?: 'CREATE' | 'DETAIL' | 'EDIT' | 'LIST';
  session: AuthSessionSnapshot;
};

export type KnowledgeFormState = {
  attachments: File[];
  category: string;
  content: string;
  status: KnowledgeArticleStatus;
  title: string;
};

export type KnowledgeArticleAttachmentState =
  KnowledgeArticleAttachmentSnapshot[];

export type KnowledgeSortOption = 'POPULAR' | 'NEWEST' | 'OLDEST';
