import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type CreateKnowledgeArticleRecord,
  type UpdateKnowledgeArticleRecord,
  KnowledgeArticleRepository,
} from '../../application/knowledge/repositories/knowledge-article.repository';
import { KnowledgeArticle } from '../../domain/knowledge/knowledge-article';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseKnowledgeArticleRow = {
  category: string;
  content: string;
  created_at: string;
  created_by_user_id: string;
  id: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
  updated_at: string;
};

type SupabaseKnowledgeArticleLikeRow = {
  article_id: string;
  user_id: string;
};

type MutationFilter = { column: string; value: string };

const KNOWLEDGE_ARTICLE_SELECT =
  'id,title,slug,category,content,status,created_by_user_id,created_at,updated_at';

@Injectable()
export class SupabaseKnowledgeArticleRepository implements KnowledgeArticleRepository {
  async listArticles(currentUserId: string): Promise<KnowledgeArticle[]> {
    const rows = await this.fetchRows();
    const likes = await this.fetchLikeRows(
      rows.map((row) => row.id),
    );

    return rows.map((row) => this.mapRow(row, likes, currentUserId));
  }

  async listPublishedArticles(currentUserId: string): Promise<KnowledgeArticle[]> {
    const rows = await this.fetchRows([
      { column: 'status', value: 'PUBLISHED' },
    ]);
    const likes = await this.fetchLikeRows(
      rows.map((row) => row.id),
    );

    return rows.map((row) => this.mapRow(row, likes, currentUserId));
  }

  async getArticleById(
    id: string,
    currentUserId: string,
  ): Promise<KnowledgeArticle | null> {
    const rows = await this.fetchRows([{ column: 'id', value: id }]);
    const article = rows[0];

    if (!article) {
      return null;
    }

    const likes = await this.fetchLikeRows([article.id]);

    return this.mapRow(article, likes, currentUserId);
  }

  async createArticle(
    command: CreateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle> {
    const rows = await this.mutateRows({
      category: command.category,
      content: command.content,
      created_by_user_id: command.createdByUserId,
      slug: command.slug,
      status: command.status,
      title: command.title,
    });

    return this.expectSingle(rows, command.createdByUserId);
  }

  async updateArticle(
    id: string,
    currentUserId: string,
    command: UpdateKnowledgeArticleRecord,
  ): Promise<KnowledgeArticle> {
    const url = this.buildUrl([{ column: 'id', value: id }]);
    const response = await this.executeRequest(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        category: command.category,
        content: command.content,
        status: command.status,
        title: command.title,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    const rows = (await response.json()) as SupabaseKnowledgeArticleRow[];
    return this.expectSingle(rows, currentUserId);
  }

  async deleteArticle(id: string): Promise<void> {
    const url = this.buildUrl([{ column: 'id', value: id }]);
    url.searchParams.delete('select');
    const response = await this.executeRequest(url, { method: 'DELETE' });

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }
  }

  async toggleArticleLike(
    articleId: string,
    userId: string,
  ): Promise<KnowledgeArticle> {
    const article = await this.getArticleById(articleId, userId);

    if (!article) {
      throw new NotFoundException('Knowledge article not found.');
    }

    const existingLike = await this.fetchLikeRows([articleId], userId);

    if (existingLike.length > 0) {
      const deleteUrl = this.buildLikesUrl([
        { column: 'article_id', value: articleId },
        { column: 'user_id', value: userId },
      ]);
      deleteUrl.searchParams.delete('select');

      const deleteResponse = await this.executeRequest(deleteUrl, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        await this.throwSupabaseError(deleteResponse);
      }
    } else {
      const insertResponse = await this.executeRequest(this.buildLikesUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          article_id: articleId,
          user_id: userId,
        }),
      });

      if (!insertResponse.ok) {
        await this.throwSupabaseError(insertResponse);
      }
    }

    const refreshedArticle = await this.getArticleById(articleId, userId);

    if (!refreshedArticle) {
      throw new NotFoundException('Knowledge article not found.');
    }

    return refreshedArticle;
  }

  private async fetchRows(
    filters: readonly MutationFilter[] = [],
  ): Promise<SupabaseKnowledgeArticleRow[]> {
    const url = this.buildUrl(filters);
    url.searchParams.set('order', 'updated_at.desc');

    const response = await this.executeRequest(url);

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    return (await response.json()) as SupabaseKnowledgeArticleRow[];
  }

  private async fetchLikeRows(
    articleIds: readonly string[],
    userId?: string,
  ): Promise<SupabaseKnowledgeArticleLikeRow[]> {
    if (articleIds.length === 0) {
      return [];
    }

    const url = this.buildLikesUrl();
    url.searchParams.set('article_id', `in.(${articleIds.join(',')})`);

    if (userId) {
      url.searchParams.set('user_id', `eq.${userId}`);
    }

    const response = await this.executeRequest(url);

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    return (await response.json()) as SupabaseKnowledgeArticleLikeRow[];
  }

  private async mutateRows(
    body: Record<string, unknown>,
  ): Promise<SupabaseKnowledgeArticleRow[]> {
    const response = await this.executeRequest(this.buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    return (await response.json()) as SupabaseKnowledgeArticleRow[];
  }

  private buildUrl(filters: readonly MutationFilter[] = []): URL {
    const config = getBackendRuntimeConfig();

    if (!config.supabaseUrl) {
      throw new ServiceUnavailableException(
        'Supabase knowledge configuration is incomplete on the backend.',
      );
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/knowledge_articles`);
    url.searchParams.set('select', KNOWLEDGE_ARTICLE_SELECT);

    for (const filter of filters) {
      url.searchParams.set(filter.column, `eq.${filter.value}`);
    }

    return url;
  }

  private buildLikesUrl(filters: readonly MutationFilter[] = []): URL {
    const config = getBackendRuntimeConfig();

    if (!config.supabaseUrl) {
      throw new ServiceUnavailableException(
        'Supabase knowledge configuration is incomplete on the backend.',
      );
    }

    const url = new URL(
      `${config.supabaseUrl}/rest/v1/knowledge_article_likes`,
    );
    url.searchParams.set('select', 'article_id,user_id');

    for (const filter of filters) {
      url.searchParams.set(filter.column, `eq.${filter.value}`);
    }

    return url;
  }

  private async executeRequest(
    url: URL,
    init?: RequestInit,
  ): Promise<Response> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseServiceRoleKey || config.supabaseAnonKey;

    if (!supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase knowledge configuration is incomplete on the backend.',
      );
    }

    try {
      return await fetch(url, {
        ...init,
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          Accept: 'application/json',
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Supabase knowledge service is unreachable from the backend.',
      );
    }
  }

  private expectSingle(
    rows: SupabaseKnowledgeArticleRow[],
    currentUserId: string,
  ): KnowledgeArticle {
    if (rows.length === 0) {
      throw new ServiceUnavailableException(
        'Supabase knowledge mutation returned no representation.',
      );
    }

    return this.mapRow(rows[0], [], currentUserId);
  }

  private mapRow(
    row: SupabaseKnowledgeArticleRow,
    likes: readonly SupabaseKnowledgeArticleLikeRow[],
    currentUserId: string,
  ): KnowledgeArticle {
    const articleLikes = likes.filter((like) => like.article_id === row.id);

    return new KnowledgeArticle(
      row.id,
      row.title,
      row.slug,
      row.category,
      row.content,
      row.status,
      row.created_by_user_id,
      row.created_at,
      row.updated_at,
      articleLikes.length,
      articleLikes.some((like) => like.user_id === currentUserId),
    );
  }

  private async throwSupabaseError(response: Response): Promise<never> {
    const message = await response.text();

    if (response.status === 404) {
      throw new NotFoundException('Knowledge article not found.');
    }

    if (response.status === 409) {
      throw new ConflictException('Knowledge article already exists.');
    }

    throw new ServiceUnavailableException(
      message || `Supabase knowledge table returned status ${response.status}.`,
    );
  }
}
