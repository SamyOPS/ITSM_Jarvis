import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  UpdateKnowledgeArticlePayload,
} from '../../domain/knowledge/knowledge-article';
import type { KnowledgeArticleAttachmentSnapshot } from '../../domain/knowledge/knowledge-article-attachment';
import { getFrontendSupabaseConfig } from '../config/supabase-env';
import { getFrontendRuntimeConfig } from '../config/env';
import { encodeStoragePath } from './ticketing-api.helpers';

export type AddKnowledgeArticleAttachmentPayload = {
  bucketId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  storagePath: string;
};

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

export async function fetchKnowledgeArticleAttachments(
  accessToken: string,
  articleId: string,
): Promise<KnowledgeArticleAttachmentSnapshot[]> {
  return requestKnowledge<KnowledgeArticleAttachmentSnapshot[]>(
    `/knowledge/articles/${articleId}/attachments`,
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

export async function addKnowledgeArticleAttachment(
  accessToken: string,
  articleId: string,
  payload: AddKnowledgeArticleAttachmentPayload,
): Promise<KnowledgeArticleAttachmentSnapshot> {
  return requestKnowledge<KnowledgeArticleAttachmentSnapshot>(
    `/knowledge/articles/${articleId}/attachments`,
    accessToken,
    {
      body: JSON.stringify(payload),
      method: 'POST',
    },
  );
}

export async function deleteKnowledgeArticleAttachment(
  accessToken: string,
  articleId: string,
  attachmentId: string,
): Promise<void> {
  await requestKnowledgeVoid(
    `/knowledge/articles/${articleId}/attachments/${attachmentId}`,
    accessToken,
    {
      method: 'DELETE',
    },
  );
}

export async function uploadKnowledgeArticleAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
  file: File,
): Promise<void> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = encodeStoragePath(storagePath);
  const response = await fetch(
    `${supabaseConfig.url}/storage/v1/object/${bucketId}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: file,
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `L'upload du fichier a échoué avec le statut ${response.status}`,
    );
  }
}

export async function downloadKnowledgeArticleAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
): Promise<Blob> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = encodeStoragePath(storagePath);
  const response = await fetch(
    `${supabaseConfig.url}/storage/v1/object/authenticated/${bucketId}/${encodedPath}`,
    {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement du fichier a échoué avec le statut ${response.status}`,
    );
  }

  return await response.blob();
}

export async function deleteKnowledgeArticleAttachmentBinary(
  accessToken: string,
  bucketId: string,
  storagePath: string,
): Promise<void> {
  const supabaseConfig = getFrontendSupabaseConfig();
  const encodedPath = encodeStoragePath(storagePath);
  const response = await fetch(
    `${supabaseConfig.url}/storage/v1/object/${bucketId}/${encodedPath}`,
    {
      method: 'DELETE',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `La suppression du fichier a échoué avec le statut ${response.status}`,
    );
  }
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
