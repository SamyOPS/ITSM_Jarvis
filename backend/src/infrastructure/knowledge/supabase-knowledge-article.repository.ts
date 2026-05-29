import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type CreateKnowledgeArticleRecord,
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

type MutationFilter = { column: string; value: string };

const KNOWLEDGE_ARTICLE_SELECT =
  'id,title,slug,category,content,status,created_by_user_id,created_at,updated_at';

@Injectable()
export class SupabaseKnowledgeArticleRepository implements KnowledgeArticleRepository {
  async listArticles(): Promise<KnowledgeArticle[]> {
    const rows = await this.fetchRows();

    return rows.map((row) => this.mapRow(row));
  }

  async listPublishedArticles(): Promise<KnowledgeArticle[]> {
    const rows = await this.fetchRows([
      { column: 'status', value: 'PUBLISHED' },
    ]);

    return rows.map((row) => this.mapRow(row));
  }

  async getArticleById(id: string): Promise<KnowledgeArticle | null> {
    const rows = await this.fetchRows([{ column: 'id', value: id }]);

    return rows[0] ? this.mapRow(rows[0]) : null;
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

    return this.expectSingle(rows);
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

  private expectSingle(rows: SupabaseKnowledgeArticleRow[]): KnowledgeArticle {
    if (rows.length === 0) {
      throw new ServiceUnavailableException(
        'Supabase knowledge mutation returned no representation.',
      );
    }

    return this.mapRow(rows[0]);
  }

  private mapRow(row: SupabaseKnowledgeArticleRow): KnowledgeArticle {
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
