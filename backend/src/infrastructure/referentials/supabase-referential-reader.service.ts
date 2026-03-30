import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { getBackendRuntimeConfig } from '../config/app-config';
import { PriorityName } from '../../domain/ticketing/priority-name';
import { SupportLevel } from '../../domain/ticketing/support-level';
import { type ReferentialCategory } from '../../domain/referentials/referential-category';
import { type ReferentialChannel } from '../../domain/referentials/referential-channel';
import { type ReferentialCiType } from '../../domain/referentials/referential-ci-type';
import { type ReferentialGroup } from '../../domain/referentials/referential-group';
import { type ReferentialPriority } from '../../domain/referentials/referential-priority';
import { type ReferentialService } from '../../domain/referentials/referential-service';

type SupabaseCategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

type SupabaseGroupRow = {
  description: string | null;
  id: string;
  level: SupportLevel | null;
  name: string;
};

type SupabasePriorityRow = {
  id: string;
  level: number;
  name: PriorityName;
  resolution_hours: number | null;
  response_hours: number | null;
};

type SupabaseServiceRow = {
  description: string | null;
  id: string;
  name: string;
};

@Injectable()
export class SupabaseReferentialReaderService {
  async listCategories(): Promise<ReferentialCategory[]> {
    const rows = await this.fetchTable<SupabaseCategoryRow>(
      'categories',
      'id,name,parent_id',
      'parent_id.asc.nullslast,name.asc',
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
    }));
  }

  async listChannels(): Promise<ReferentialChannel[]> {
    return this.fetchTable<ReferentialChannel>(
      'channels',
      'id,name',
      'name.asc',
    );
  }

  async listCiTypes(): Promise<ReferentialCiType[]> {
    return this.fetchTable<ReferentialCiType>(
      'ci_types',
      'id,name',
      'name.asc',
    );
  }

  async listGroups(): Promise<ReferentialGroup[]> {
    return this.fetchTable<SupabaseGroupRow>(
      'groups',
      'id,name,description,level',
      'level.asc.nullslast,name.asc',
    );
  }

  async listPriorities(): Promise<ReferentialPriority[]> {
    const rows = await this.fetchTable<SupabasePriorityRow>(
      'priorities',
      'id,name,level,response_hours,resolution_hours',
      'level.asc',
    );

    return rows.map((row) => ({
      id: row.id,
      level: row.level,
      name: row.name,
      resolutionHours: row.resolution_hours,
      responseHours: row.response_hours,
    }));
  }

  async listServices(): Promise<ReferentialService[]> {
    return this.fetchTable<SupabaseServiceRow>(
      'services',
      'id,name,description',
      'name.asc',
    );
  }

  private async fetchTable<Row>(
    table: string,
    select: string,
    order: string,
  ): Promise<Row[]> {
    const config = getBackendRuntimeConfig();
    const supabaseApiKey =
      config.supabaseServiceRoleKey || config.supabaseAnonKey;

    if (!config.supabaseUrl || !supabaseApiKey) {
      throw new ServiceUnavailableException(
        'Supabase referential configuration is incomplete on the backend.',
      );
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set('select', select);
    url.searchParams.set('order', order);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          apikey: supabaseApiKey,
          Authorization: `Bearer ${supabaseApiKey}`,
          Accept: 'application/json',
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        `Supabase referential table ${table} is unreachable from the backend.`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Supabase referential table ${table} returned status ${response.status}.`,
      );
    }

    return (await response.json()) as Row[];
  }
}
