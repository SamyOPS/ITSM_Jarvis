import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
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
        `Le chargement de la base de connaissances a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as T;
}
