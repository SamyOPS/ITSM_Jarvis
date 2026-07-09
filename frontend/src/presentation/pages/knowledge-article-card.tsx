import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ThumbsUp } from 'lucide-react';
import type { KnowledgeArticle } from '../../domain/knowledge/knowledge-article';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import { withReturnPageQuery } from '../helpers/pagination-route.helpers';
import { formatDate } from './knowledge-page.helpers';

type KnowledgeArticleCardProps = {
  article: KnowledgeArticle;
  isLiking: boolean;
  onToggleLike: (
    articleId: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  page: number;
};

export function KnowledgeArticleCard({
  article,
  isLiking,
  onToggleLike,
  page,
}: KnowledgeArticleCardProps) {
  const titleRef = useRef<HTMLElement | null>(null);
  const [excerptLineClamp, setExcerptLineClamp] = useState(3);

  useEffect(() => {
    const element = titleRef.current;

    if (!element) {
      return;
    }

    const updateExcerptLineClamp = (): void => {
      const computedStyle = window.getComputedStyle(element);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);

      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setExcerptLineClamp(3);
        return;
      }

      const titleLineCount = Math.max(
        1,
        Math.round(element.getBoundingClientRect().height / lineHeight),
      );

      setExcerptLineClamp(titleLineCount <= 1 ? 4 : 3);
    };

    updateExcerptLineClamp();

    const resizeObserver = new ResizeObserver(() => {
      updateExcerptLineClamp();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [article.title]);

  return (
    <article
      className="kb-card"
      onClick={() =>
        navigateTo(
          withReturnPageQuery(`/knowledge/articles/${article.id}`, page),
        )
      }
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateTo(
            withReturnPageQuery(`/knowledge/articles/${article.id}`, page),
          );
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="kb-card-top">
        <span className="kb-card-category">{article.category}</span>
        <span
          className={`kb-card-status ${getKnowledgeStatusClassName(
            article.status,
          )}`}
        >
          {formatKnowledgeStatus(article.status)}
        </span>
      </div>
      <strong className="kb-card-title" ref={titleRef}>
        {article.title}
      </strong>
      <p
        className="kb-card-excerpt"
        style={
          {
            '--kb-excerpt-lines': excerptLineClamp,
          } as CSSProperties
        }
      >
        {article.content}
      </p>
      <div className="kb-card-footer">
        <small className="kb-card-meta">
          Mis a jour le {formatDate(article.updatedAt)}
        </small>

        <button
          aria-label={
            article.likedByMe
              ? "Retirer le like de l'article"
              : "Liker l'article"
          }
          className={`kb-like-button${article.likedByMe ? ' is-active' : ''}`}
          disabled={isLiking}
          onClick={(event) => onToggleLike(article.id, event)}
          type="button"
        >
          <ThumbsUp size={15} />
          <span>{article.likesCount}</span>
        </button>
      </div>
    </article>
  );
}

function formatKnowledgeStatus(status: KnowledgeArticle['status']): string {
  switch (status) {
    case 'PUBLISHED':
      return 'Publie';
    case 'REJECTED':
      return 'Refuse';
    default:
      return 'En attente';
  }
}

function getKnowledgeStatusClassName(
  status: KnowledgeArticle['status'],
): string {
  switch (status) {
    case 'PUBLISHED':
      return 'is-published';
    case 'REJECTED':
      return 'is-rejected';
    default:
      return 'is-draft';
  }
}
