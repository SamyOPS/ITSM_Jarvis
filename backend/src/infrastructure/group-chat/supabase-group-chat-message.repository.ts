import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  type CreateGroupChatMessageRecord,
  GroupChatMessageRepository,
} from '../../application/group-chat/repositories/group-chat-message.repository';
import { GroupChatMessage } from '../../domain/group-chat/group-chat-message';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseGroupChatMessageRow = {
  author_user_id: string;
  body: string;
  created_at: string;
  group_id: string;
  id: string;
};

const GROUP_CHAT_MESSAGE_SELECT = 'id,group_id,author_user_id,body,created_at';

@Injectable()
export class SupabaseGroupChatMessageRepository implements GroupChatMessageRepository {
  async listMessages(groupId: string): Promise<GroupChatMessage[]> {
    const url = this.buildUrl('group_chat_messages');
    url.searchParams.set('select', GROUP_CHAT_MESSAGE_SELECT);
    url.searchParams.set('group_id', `eq.${groupId}`);
    url.searchParams.set('order', 'created_at.asc');
    url.searchParams.set('limit', '100');

    const response = await this.executeRequest(url);

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    const rows = (await response.json()) as SupabaseGroupChatMessageRow[];

    return rows.map(mapRow);
  }

  async createMessage(
    record: CreateGroupChatMessageRecord,
  ): Promise<GroupChatMessage> {
    const url = this.buildUrl('group_chat_messages');
    const response = await this.executeRequest(url, {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        author_user_id: record.authorUserId,
        body: record.body,
        group_id: record.groupId,
      }),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    const rows = (await response.json()) as SupabaseGroupChatMessageRow[];
    const row = rows[0];

    if (!row) {
      throw new ServiceUnavailableException(
        'Supabase group chat message creation did not return a row.',
      );
    }

    return mapRow(row);
  }

  async listGroupIdsForUser(userId: string): Promise<string[]> {
    const url = this.buildUrl('user_groups');
    url.searchParams.set('select', 'group_id');
    url.searchParams.set('user_id', `eq.${userId}`);

    const response = await this.executeRequest(url);

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    const rows = (await response.json()) as Array<{ group_id: string }>;

    return [...new Set(rows.map((row) => row.group_id).filter(Boolean))];
  }

  private buildUrl(tableName: string): URL {
    const config = getBackendRuntimeConfig();

    if (!config.supabaseUrl) {
      throw new ServiceUnavailableException(
        'Supabase group chat configuration is incomplete on the backend.',
      );
    }

    return new URL(`${config.supabaseUrl}/rest/v1/${tableName}`);
  }

  private async executeRequest(
    url: URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const config = getBackendRuntimeConfig();
    const apiKey = config.supabaseServiceRoleKey;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Supabase group chat configuration is incomplete on the backend.',
      );
    }

    return fetch(url, {
      ...init,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  }

  private async throwSupabaseError(response: Response): Promise<never> {
    const message = await response.text();

    throw new ServiceUnavailableException(
      message ||
        `Supabase group chat table returned status ${response.status}.`,
    );
  }
}

function mapRow(row: SupabaseGroupChatMessageRow): GroupChatMessage {
  return new GroupChatMessage(
    row.id,
    row.group_id,
    row.author_user_id,
    row.body,
    row.created_at,
  );
}
