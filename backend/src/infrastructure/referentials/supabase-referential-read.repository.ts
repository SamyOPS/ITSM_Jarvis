import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ReferentialCategoryReadRepository } from '../../application/referentials/repositories/referential-category-read.repository';
import { ReferentialChannelReadRepository } from '../../application/referentials/repositories/referential-channel-read.repository';
import { ReferentialCiReadRepository } from '../../application/referentials/repositories/referential-ci-read.repository';
import { ReferentialCiTypeReadRepository } from '../../application/referentials/repositories/referential-ci-type-read.repository';
import { ReferentialGroupReadRepository } from '../../application/referentials/repositories/referential-group-read.repository';
import { ReferentialPriorityReadRepository } from '../../application/referentials/repositories/referential-priority-read.repository';
import { ReferentialServiceReadRepository } from '../../application/referentials/repositories/referential-service-read.repository';
import { ReferentialCategory } from '../../domain/referentials/referential-category';
import { ReferentialChannel } from '../../domain/referentials/referential-channel';
import { ReferentialCi } from '../../domain/referentials/referential-ci';
import { ReferentialCiType } from '../../domain/referentials/referential-ci-type';
import { ReferentialGroup } from '../../domain/referentials/referential-group';
import { ReferentialPriority } from '../../domain/referentials/referential-priority';
import { ReferentialService } from '../../domain/referentials/referential-service';
import { PriorityName } from '../../domain/ticketing/priority-name';
import { SupportLevel } from '../../domain/ticketing/support-level';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseCategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

type SupabaseCiRow = {
  assigned_user_id: string | null;
  ci_type_id: string;
  id: string;
  name: string;
  serial_number: string | null;
  status: string;
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
export class SupabaseReferentialReadRepository
  implements
    ReferentialCategoryReadRepository,
    ReferentialChannelReadRepository,
    ReferentialCiReadRepository,
    ReferentialCiTypeReadRepository,
    ReferentialGroupReadRepository,
    ReferentialPriorityReadRepository,
    ReferentialServiceReadRepository
{
  async listCategories(): Promise<ReferentialCategory[]> {
    const rows = await this.fetchTable<SupabaseCategoryRow>(
      'categories',
      'id,name,parent_id',
      'parent_id.asc.nullslast,name.asc',
    );

    return rows.map(
      (row) => new ReferentialCategory(row.id, row.name, row.parent_id),
    );
  }

  async listChannels(): Promise<ReferentialChannel[]> {
    const rows = await this.fetchTable<{ id: string; name: string }>(
      'channels',
      'id,name',
      'name.asc',
    );

    return rows.map((row) => new ReferentialChannel(row.id, row.name));
  }

  async listCis(): Promise<ReferentialCi[]> {
    const rows = await this.fetchTable<SupabaseCiRow>(
      'cis',
      'id,name,ci_type_id,status,assigned_user_id,serial_number',
      'name.asc',
    );

    return rows.map(
      (row) =>
        new ReferentialCi(
          row.id,
          row.name,
          row.ci_type_id,
          row.status,
          row.assigned_user_id,
          row.serial_number,
        ),
    );
  }

  async listCiTypes(): Promise<ReferentialCiType[]> {
    const rows = await this.fetchTable<{ id: string; name: string }>(
      'ci_types',
      'id,name',
      'name.asc',
    );

    return rows.map((row) => new ReferentialCiType(row.id, row.name));
  }

  async listGroups(): Promise<ReferentialGroup[]> {
    const rows = await this.fetchTable<SupabaseGroupRow>(
      'groups',
      'id,name,description,level',
      'level.asc.nullslast,name.asc',
    );

    return rows.map(
      (row) =>
        new ReferentialGroup(row.id, row.name, row.description, row.level),
    );
  }

  async listPriorities(): Promise<ReferentialPriority[]> {
    const rows = await this.fetchTable<SupabasePriorityRow>(
      'priorities',
      'id,name,level,response_hours,resolution_hours',
      'level.asc',
    );

    return rows.map(
      (row) =>
        new ReferentialPriority(
          row.id,
          row.name,
          row.level,
          row.response_hours,
          row.resolution_hours,
        ),
    );
  }

  async listServices(): Promise<ReferentialService[]> {
    const rows = await this.fetchTable<SupabaseServiceRow>(
      'services',
      'id,name,description',
      'name.asc',
    );

    return rows.map(
      (row) => new ReferentialService(row.id, row.name, row.description),
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
