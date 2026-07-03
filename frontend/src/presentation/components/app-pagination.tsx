import { useEffect, useState } from 'react';

type PaginationItem =
  | { key: string; page: number; type: 'page' }
  | { direction: 'backward' | 'forward'; key: string; type: 'ellipsis' };

type AppPaginationProps = {
  className?: string;
  onPageChange: (page: number) => void;
  page: number;
  scrollToTop?: boolean;
  summary?: string;
  totalPages: number;
};

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function getPaginationItems(
  page: number,
  totalPages: number,
  isCompact = false,
): PaginationItem[] {
  const safeTotal = Math.max(totalPages, 1);
  const safePage = clampPage(page, safeTotal);

  if (isCompact && safeTotal > 3) {
    if (safePage === 1) {
      return [
        { key: 'page-1', page: 1, type: 'page' },
        { direction: 'forward', key: 'ellipsis-forward', type: 'ellipsis' },
        { key: `page-${safeTotal}`, page: safeTotal, type: 'page' },
      ];
    }

    if (safePage === safeTotal) {
      return [
        { key: 'page-1', page: 1, type: 'page' },
        { direction: 'backward', key: 'ellipsis-backward', type: 'ellipsis' },
        { key: `page-${safeTotal}`, page: safeTotal, type: 'page' },
      ];
    }

    return [
      { key: 'page-1', page: 1, type: 'page' },
      { key: `page-${safePage}`, page: safePage, type: 'page' },
      { key: `page-${safeTotal}`, page: safeTotal, type: 'page' },
    ];
  }

  if (safeTotal <= 4) {
    return Array.from({ length: safeTotal }, (_, index) => ({
      key: `page-${index + 1}`,
      page: index + 1,
      type: 'page',
    }));
  }

  if (safePage <= 3) {
    return [
      { key: 'page-1', page: 1, type: 'page' },
      { key: 'page-2', page: 2, type: 'page' },
      { key: 'page-3', page: 3, type: 'page' },
      { direction: 'forward', key: 'ellipsis-forward', type: 'ellipsis' },
      { key: `page-${safeTotal}`, page: safeTotal, type: 'page' },
    ];
  }

  if (safePage >= safeTotal - 2) {
    return [
      { key: 'page-1', page: 1, type: 'page' },
      { direction: 'backward', key: 'ellipsis-backward', type: 'ellipsis' },
      { key: `page-${safeTotal - 2}`, page: safeTotal - 2, type: 'page' },
      { key: `page-${safeTotal - 1}`, page: safeTotal - 1, type: 'page' },
      { key: `page-${safeTotal}`, page: safeTotal, type: 'page' },
    ];
  }

  return [
    { key: 'page-1', page: 1, type: 'page' },
    { direction: 'backward', key: 'ellipsis-backward', type: 'ellipsis' },
    { key: `page-${safePage - 1}`, page: safePage - 1, type: 'page' },
    { key: `page-${safePage}`, page: safePage, type: 'page' },
    { key: `page-${safePage + 1}`, page: safePage + 1, type: 'page' },
    { direction: 'forward', key: 'ellipsis-forward', type: 'ellipsis' },
    { key: `page-${safeTotal}`, page: safeTotal, type: 'page' },
  ];
}

function useCompactPagination(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 420px)');

    function handleChange(): void {
      setIsCompact(mediaQuery.matches);
    }

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isCompact;
}

export function AppPagination({
  className,
  onPageChange,
  page,
  scrollToTop = true,
  summary,
  totalPages,
}: AppPaginationProps) {
  const safeTotal = Math.max(totalPages, 1);
  const safePage = clampPage(page, safeTotal);
  const isCompact = useCompactPagination();
  const paginationItems = getPaginationItems(safePage, safeTotal, isCompact);

  function handlePageChange(nextPage: number): void {
    const targetPage = clampPage(nextPage, safeTotal);

    if (targetPage === safePage) {
      return;
    }

    onPageChange(targetPage);
    if (scrollToTop) {
      window.scrollTo({ behavior: 'smooth', top: 0 });
    }
  }

  function handleEllipsisClick(direction: 'backward' | 'forward'): void {
    handlePageChange(
      direction === 'forward'
        ? Math.min(safeTotal, safePage + 3)
        : Math.max(1, safePage - 3),
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className={className ? `app-pagination ${className}` : 'app-pagination'}
    >
      {summary ? <p className="app-pagination-summary">{summary}</p> : null}

      <div className="app-pagination-controls">
        <button
          aria-label="Page precedente"
          className="app-pagination-button"
          disabled={safePage <= 1}
          onClick={() => handlePageChange(safePage - 1)}
          type="button"
        >
          {'<'}
        </button>

        {paginationItems.map((item) =>
          item.type === 'page' ? (
            <button
              aria-current={item.page === safePage ? 'page' : undefined}
              className={
                item.page === safePage
                  ? 'app-pagination-button is-active'
                  : 'app-pagination-button'
              }
              key={item.key}
              onClick={() => handlePageChange(item.page)}
              type="button"
            >
              {item.page}
            </button>
          ) : (
            <button
              aria-label={
                item.direction === 'forward'
                  ? 'Avancer de 3 pages'
                  : 'Reculer de 3 pages'
              }
              className="app-pagination-button app-pagination-ellipsis"
              key={item.key}
              onClick={() => handleEllipsisClick(item.direction)}
              type="button"
            >
              ...
            </button>
          ),
        )}

        <button
          aria-label="Page suivante"
          className="app-pagination-button"
          disabled={safePage >= safeTotal}
          onClick={() => handlePageChange(safePage + 1)}
          type="button"
        >
          {'>'}
        </button>
      </div>
    </nav>
  );
}
