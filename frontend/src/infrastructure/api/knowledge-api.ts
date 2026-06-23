import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  UpdateKnowledgeArticlePayload,
} from '../../domain/knowledge/knowledge-article';
import { getFrontendRuntimeConfig } from '../config/env';

export async function fetchKnowledgeArticles(
  accessToken: string,
): Promise<KnowledgeArticle[]> {
  return requestKnowledge<KnowledgeArticle[]>(
    '/knowledge/articles',
    accessToken,
  );
}

export async function fetchKnowledgeArticle(
  accessToken: string,
  articleId: string,
): Promise<KnowledgeArticle> {
  return requestKnowledge<KnowledgeArticle>(
    `/knowledge/articles/${articleId}`,
    accessToken,
  );
}

export async function createKnowledgeArticle(
  accessToken: string,
  payload: CreateKnowledgeArticlePayload,
): Promise<KnowledgeArticle> {
  return requestKnowledge<KnowledgeArticle>(
    '/knowledge/articles',
    accessToken,
    {
      body: JSON.stringify(payload),
      method: 'POST',
    },
  );
}

export async function updateKnowledgeArticle(
  accessToken: string,
  articleId: string,
  payload: UpdateKnowledgeArticlePayload,
): Promise<KnowledgeArticle> {
  return requestKnowledge<KnowledgeArticle>(
    `/knowledge/articles/${articleId}`,
    accessToken,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
    },
  );
}

export async function deleteKnowledgeArticle(
  accessToken: string,
  articleId: string,
): Promise<void> {
  await requestKnowledgeVoid(`/knowledge/articles/${articleId}`, accessToken, {
    method: 'DELETE',
  });
}

export async function toggleKnowledgeArticleLike(
  accessToken: string,
  articleId: string,
): Promise<KnowledgeArticle> {
  return requestKnowledge<KnowledgeArticle>(
    `/knowledge/articles/${articleId}/like`,
    accessToken,
    {
      method: 'POST',
    },
  );
}

async function requestKnowledge<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Le chargement de la base de connaissances a échoué avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

async function requestKnowledgeVoid(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<void> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `L'opération a échoué avec le statut ${response.status}`,
    );
  }
}
