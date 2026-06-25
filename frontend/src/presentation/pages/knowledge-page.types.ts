import type { KnowledgeArticleStatus } from '../../domain/knowledge/knowledge-article';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { KnowledgeArticleAttachmentSnapshot } from '../../domain/knowledge/knowledge-article-attachment';
import type { KnowledgeArticle } from '../../domain/knowledge/knowledge-article';

export type KnowledgePageProps = {
  articleId?: string;
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

export type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; article: KnowledgeArticle }
  | { type: 'delete'; article: KnowledgeArticle };

export type KnowledgeSortOption = 'POPULAR' | 'NEWEST' | 'OLDEST';
