export function getPageQueryParam(name = 'page'): number {
  if (typeof window === 'undefined') {
    return 1;
  }

  const page = Number.parseInt(
    new URLSearchParams(window.location.search).get(name) ?? '',
    10,
  );

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function withPageQuery(path: string, page: number): string {
  const safePage = Math.max(1, Math.trunc(page));

  if (safePage <= 1) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}page=${safePage}`;
}

export function withReturnPageQuery(path: string, page: number): string {
  const safePage = Math.max(1, Math.trunc(page));
  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}fromPage=${safePage}`;
}
