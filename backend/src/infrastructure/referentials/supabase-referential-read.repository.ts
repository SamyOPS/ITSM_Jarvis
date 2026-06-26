import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type CreateReferentialCategoryCommand,
  type CreateReferentialChannelCommand,
  type CreateReferentialCiCommand,
  type CreateReferentialCiTypeCommand,
  type CreateReferentialGroupCommand,
  type CreateReferentialPriorityCommand,
  type UpdateReferentialCategoryCommand,
  type UpdateReferentialChannelCommand,
  type UpdateReferentialCiCommand,
  type UpdateReferentialCiTypeCommand,
  type UpdateReferentialGroupCommand,
  type UpdateReferentialPriorityCommand,
} from '../../application/referentials/referential-admin.commands';
import { ReferentialCategoryReadRepository } from '../../application/referentials/repositories/referential-category-read.repository';
import { ReferentialCategoryWriteRepository } from '../../application/referentials/repositories/referential-category-write.repository';
import { ReferentialChannelReadRepository } from '../../application/referentials/repositories/referential-channel-read.repository';
import { ReferentialChannelWriteRepository } from '../../application/referentials/repositories/referential-channel-write.repository';
import { ReferentialCiReadRepository } from '../../application/referentials/repositories/referential-ci-read.repository';
import { ReferentialCiTypeReadRepository } from '../../application/referentials/repositories/referential-ci-type-read.repository';
import { ReferentialCiTypeWriteRepository } from '../../application/referentials/repositories/referential-ci-type-write.repository';
import { ReferentialCiWriteRepository } from '../../application/referentials/repositories/referential-ci-write.repository';
import { ReferentialGroupReadRepository } from '../../application/referentials/repositories/referential-group-read.repository';
import { ReferentialGroupWriteRepository } from '../../application/referentials/repositories/referential-group-write.repository';
import { ReferentialPriorityReadRepository } from '../../application/referentials/repositories/referential-priority-read.repository';
import { ReferentialPriorityWriteRepository } from '../../application/referentials/repositories/referential-priority-write.repository';
import { ReferentialCategory } from '../../domain/referentials/referential-category';
import { ReferentialChannel } from '../../domain/referentials/referential-channel';
import { ReferentialCi } from '../../domain/referentials/referential-ci';
import { ReferentialCiType } from '../../domain/referentials/referential-ci-type';
import { ReferentialGroup } from '../../domain/referentials/referential-group';
import { ReferentialPriority } from '../../domain/referentials/referential-priority';
import { type CiStatus } from '../../domain/ticketing/ci-status';
import { PriorityName } from '../../domain/ticketing/priority-name';
import { SupportLevel } from '../../domain/ticketing/support-level';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabaseCategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
};
type SupabaseChannelRow = { id: string; name: string };
type SupabaseCiTypeRow = { id: string; name: string };
type SupabaseCiRow = {
  assigned_user_id: string | null;
  archived_at: string | null;
  brand: string | null;
  ci_type_id: string;
  comment: string | null;
  created_at: string | null;
  id: string;
  ip_address: string | null;
  location: string | null;
  mac_address: string | null;
  model: string | null;
  name: string;
  purchase_date: string | null;
  serial_number: string | null;
  status: CiStatus;
  warranty_end_date: string | null;
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
type SupabaseErrorPayload = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};
type MutationFilter = { column: string; value: string };

@Injectable()
export class SupabaseReferentialReadRepository
  implements
    ReferentialCategoryReadRepository,
    ReferentialCategoryWriteRepository,
    ReferentialChannelReadRepository,
    ReferentialChannelWriteRepository,
    ReferentialCiReadRepository,
    ReferentialCiWriteRepository,
    ReferentialCiTypeReadRepository,
    ReferentialCiTypeWriteRepository,
    ReferentialGroupReadRepository,
    ReferentialGroupWriteRepository,
    ReferentialPriorityReadRepository,
    ReferentialPriorityWriteRepository
{
  async listCategories(): Promise<ReferentialCategory[]> {
    const rows = await this.fetchTable<SupabaseCategoryRow>(
      'categories',
      'id,name,parent_id',
      'parent_id.asc.nullslast,name.asc',
    );
    return rows.map((row) => this.mapCategory(row));
  }

  async createCategory(
    command: CreateReferentialCategoryCommand,
  ): Promise<ReferentialCategory> {
    const rows = await this.mutateTable<SupabaseCategoryRow>(
      'POST',
      'categories',
      { name: command.name, parent_id: command.parentId },
      'id,name,parent_id',
    );
    return this.expectSingle(rows, 'categories', (row) =>
      this.mapCategory(row),
    );
  }

  async updateCategory(
    command: UpdateReferentialCategoryCommand,
  ): Promise<ReferentialCategory> {
    const rows = await this.mutateTable<SupabaseCategoryRow>(
      'PATCH',
      'categories',
      { name: command.name, parent_id: command.parentId },
      'id,name,parent_id',
      [{ column: 'id', value: command.id }],
    );
    return this.expectSingle(
      rows,
      'categories',
      (row) => this.mapCategory(row),
      command.id,
    );
  }

  async deleteCategory(id: string): Promise<void> {
    await this.deleteById('categories', id);
  }

  async listChannels(): Promise<ReferentialChannel[]> {
    const rows = await this.fetchTable<SupabaseChannelRow>(
      'channels',
      'id,name',
      'name.asc',
    );
    return rows.map((row) => this.mapChannel(row));
  }

  async createChannel(
    command: CreateReferentialChannelCommand,
  ): Promise<ReferentialChannel> {
    const rows = await this.mutateTable<SupabaseChannelRow>(
      'POST',
      'channels',
      { name: command.name },
      'id,name',
    );
    return this.expectSingle(rows, 'channels', (row) => this.mapChannel(row));
  }

  async updateChannel(
    command: UpdateReferentialChannelCommand,
  ): Promise<ReferentialChannel> {
    const rows = await this.mutateTable<SupabaseChannelRow>(
      'PATCH',
      'channels',
      { name: command.name },
      'id,name',
      [{ column: 'id', value: command.id }],
    );
    return this.expectSingle(
      rows,
      'channels',
      (row) => this.mapChannel(row),
      command.id,
    );
  }

  async deleteChannel(id: string): Promise<void> {
    await this.deleteById('channels', id);
  }

  async listCis(): Promise<ReferentialCi[]> {
    const rows = await this.fetchTable<SupabaseCiRow>(
      'cis',
      'id,name,ci_type_id,status,assigned_user_id,serial_number,brand,model,location,purchase_date,warranty_end_date,ip_address,mac_address,comment,archived_at,created_at',
      'created_at.desc',
    );
    return rows.map((row) => this.mapCi(row));
  }

  async createCi(command: CreateReferentialCiCommand): Promise<ReferentialCi> {
    const rows = await this.mutateTable<SupabaseCiRow>(
      'POST',
      'cis',
      {
        name: command.name,
        ci_type_id: command.ciTypeId,
        status: command.status,
        assigned_user_id: command.assignedUserId,
        serial_number: command.serialNumber,
        brand: command.brand,
        model: command.model,
        location: command.location,
        purchase_date: command.purchaseDate,
        warranty_end_date: command.warrantyEndDate,
        ip_address: command.ipAddress,
        mac_address: command.macAddress,
        comment: command.comment,
        archived_at: command.archivedAt,
      },
      'id,name,ci_type_id,status,assigned_user_id,serial_number,brand,model,location,purchase_date,warranty_end_date,ip_address,mac_address,comment,archived_at,created_at',
    );
    return this.expectSingle(rows, 'cis', (row) => this.mapCi(row));
  }

  async updateCi(command: UpdateReferentialCiCommand): Promise<ReferentialCi> {
    const rows = await this.mutateTable<SupabaseCiRow>(
      'PATCH',
      'cis',
      {
        name: command.name,
        ci_type_id: command.ciTypeId,
        status: command.status,
        assigned_user_id: command.assignedUserId,
        serial_number: command.serialNumber,
        brand: command.brand,
        model: command.model,
        location: command.location,
        purchase_date: command.purchaseDate,
        warranty_end_date: command.warrantyEndDate,
        ip_address: command.ipAddress,
        mac_address: command.macAddress,
        comment: command.comment,
        archived_at: command.archivedAt,
      },
      'id,name,ci_type_id,status,assigned_user_id,serial_number,brand,model,location,purchase_date,warranty_end_date,ip_address,mac_address,comment,archived_at,created_at',
      [{ column: 'id', value: command.id }],
    );
    return this.expectSingle(rows, 'cis', (row) => this.mapCi(row), command.id);
  }

  async deleteCi(id: string): Promise<void> {
    await this.deleteById('cis', id);
  }

  async listCiTypes(): Promise<ReferentialCiType[]> {
    const rows = await this.fetchTable<SupabaseCiTypeRow>(
      'ci_types',
      'id,name',
      'name.asc',
    );
    return rows.map((row) => this.mapCiType(row));
  }

  async createCiType(
    command: CreateReferentialCiTypeCommand,
  ): Promise<ReferentialCiType> {
    const rows = await this.mutateTable<SupabaseCiTypeRow>(
      'POST',
      'ci_types',
      { name: command.name },
      'id,name',
    );
    return this.expectSingle(rows, 'ci_types', (row) => this.mapCiType(row));
  }

  async updateCiType(
    command: UpdateReferentialCiTypeCommand,
  ): Promise<ReferentialCiType> {
    const rows = await this.mutateTable<SupabaseCiTypeRow>(
      'PATCH',
      'ci_types',
      { name: command.name },
      'id,name',
      [{ column: 'id', value: command.id }],
    );
    return this.expectSingle(
      rows,
      'ci_types',
      (row) => this.mapCiType(row),
      command.id,
    );
  }

  async deleteCiType(id: string): Promise<void> {
    await this.deleteById('ci_types', id);
  }
  async listGroups(): Promise<ReferentialGroup[]> {
    const rows = await this.fetchTable<SupabaseGroupRow>(
      'groups',
      'id,name,description,level',
      'level.asc.nullslast,name.asc',
    );
    return rows.map((row) => this.mapGroup(row));
  }

  async createGroup(
    command: CreateReferentialGroupCommand,
  ): Promise<ReferentialGroup> {
    const rows = await this.mutateTable<SupabaseGroupRow>(
      'POST',
      'groups',
      {
        name: command.name,
        description: command.description,
        level: command.level,
      },
      'id,name,description,level',
    );
    return this.expectSingle(rows, 'groups', (row) => this.mapGroup(row));
  }

  async updateGroup(
    command: UpdateReferentialGroupCommand,
  ): Promise<ReferentialGroup> {
    const rows = await this.mutateTable<SupabaseGroupRow>(
      'PATCH',
      'groups',
      {
        name: command.name,
        description: command.description,
        level: command.level,
      },
      'id,name,description,level',
      [{ column: 'id', value: command.id }],
    );
    return this.expectSingle(
      rows,
      'groups',
      (row) => this.mapGroup(row),
      command.id,
    );
  }

  async deleteGroup(id: string): Promise<void> {
    await this.deleteById('groups', id);
  }

  async listPriorities(): Promise<ReferentialPriority[]> {
    const rows = await this.fetchTable<SupabasePriorityRow>(
      'priorities',
      'id,name,level,response_hours,resolution_hours',
      'level.asc',
    );
    return rows.map((row) => this.mapPriority(row));
  }

  async createPriority(
    command: CreateReferentialPriorityCommand,
  ): Promise<ReferentialPriority> {
    const rows = await this.mutateTable<SupabasePriorityRow>(
      'POST',
      'priorities',
      {
        name: command.name,
        level: command.level,
        response_hours: command.responseHours,
        resolution_hours: command.resolutionHours,
      },
      'id,name,level,response_hours,resolution_hours',
    );
    return this.expectSingle(rows, 'priorities', (row) =>
      this.mapPriority(row),
    );
  }

  async updatePriority(
    command: UpdateReferentialPriorityCommand,
  ): Promise<ReferentialPriority> {
    const rows = await this.mutateTable<SupabasePriorityRow>(
      'PATCH',
      'priorities',
      {
        name: command.name,
        level: command.level,
        response_hours: command.responseHours,
        resolution_hours: command.resolutionHours,
      },
      'id,name,level,response_hours,resolution_hours',
      [{ column: 'id', value: command.id }],
    );
    return this.expectSingle(
      rows,
      'priorities',
      (row) => this.mapPriority(row),
      command.id,
    );
  }

  async deletePriority(id: string): Promise<void> {
    await this.deleteById('priorities', id);
  }

  private mapCategory(row: SupabaseCategoryRow): ReferentialCategory {
    return new ReferentialCategory(row.id, row.name, row.parent_id);
  }

  private mapChannel(row: SupabaseChannelRow): ReferentialChannel {
    return new ReferentialChannel(row.id, row.name);
  }

  private mapCi(row: SupabaseCiRow): ReferentialCi {
    return new ReferentialCi(
      row.id,
      row.name,
      row.ci_type_id,
      row.status,
      row.assigned_user_id,
      row.serial_number,
      row.brand,
      row.model,
      row.location,
      row.purchase_date,
      row.warranty_end_date,
      row.ip_address,
      row.mac_address,
      row.comment,
      row.archived_at,
      row.created_at,
    );
  }

  private mapCiType(row: SupabaseCiTypeRow): ReferentialCiType {
    return new ReferentialCiType(row.id, row.name);
  }

  private mapGroup(row: SupabaseGroupRow): ReferentialGroup {
    return new ReferentialGroup(row.id, row.name, row.description, row.level);
  }

  private mapPriority(row: SupabasePriorityRow): ReferentialPriority {
    return new ReferentialPriority(
      row.id,
      row.name,
      row.level,
      row.response_hours,
      row.resolution_hours,
    );
  }

  private async fetchTable<Row>(
    table: string,
    select: string,
    order: string,
  ): Promise<Row[]> {
    const url = this.buildUrl(table, select, order);
    const response = await this.executeRequest(url);

    if (!response.ok) {
      await this.throwMappedMutationError(response, table);
    }

    return (await response.json()) as Row[];
  }

  private async mutateTable<Row>(
    method: 'POST' | 'PATCH',
    table: string,
    body: Record<string, unknown>,
    select: string,
    filters: readonly MutationFilter[] = [],
  ): Promise<Row[]> {
    const url = this.buildUrl(table, select, undefined, filters);
    const response = await this.executeRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this.throwMappedMutationError(response, table);
    }

    return (await response.json()) as Row[];
  }

  private async deleteById(table: string, id: string): Promise<void> {
    const url = this.buildUrl(table, 'id', undefined, [
      { column: 'id', value: id },
    ]);
    const response = await this.executeRequest(url, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });

    if (!response.ok) {
      await this.throwMappedMutationError(response, table);
    }

    const rows = (await response.json()) as Array<{ id: string }>;
    if (rows.length === 0) {
      throw new NotFoundException(`No ${table} row found for id ${id}.`);
    }
  }

  private expectSingle<Row, Entity>(
    rows: Row[],
    table: string,
    mapper: (row: Row) => Entity,
    id?: string,
  ): Entity {
    if (rows.length === 0) {
      if (id) {
        throw new NotFoundException(`No ${table} row found for id ${id}.`);
      }

      throw new ServiceUnavailableException(
        `Supabase ${table} mutation returned no representation.`,
      );
    }

    return mapper(rows[0]);
  }

  private buildUrl(
    table: string,
    select: string,
    order?: string,
    filters: readonly MutationFilter[] = [],
  ): URL {
    const config = getBackendRuntimeConfig();
    const supabaseUrl = config.supabaseUrl;

    if (!supabaseUrl) {
      throw new ServiceUnavailableException(
        'Supabase referential configuration is incomplete on the backend.',
      );
    }

    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set('select', select);

    if (order) {
      url.searchParams.set('order', order);
    }

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
        'Supabase referential configuration is incomplete on the backend.',
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
        'Supabase referential service is unreachable from the backend.',
      );
    }
  }

  private async throwMappedMutationError(
    response: Response,
    table: string,
  ): Promise<never> {
    const payload = await this.readErrorPayload(response);
    const message = payload.message ?? payload.details ?? payload.hint;
    const suffix = message ? ` ${message}` : '';

    if (response.status === 400) {
      throw new BadRequestException(
        `Supabase rejected the ${table} mutation.${suffix}`,
      );
    }

    if (response.status === 404) {
      throw new NotFoundException(
        `Supabase ${table} resource was not found.${suffix}`,
      );
    }

    if (response.status === 409) {
      throw new ConflictException(
        `Supabase reported a conflict on ${table}.${suffix}`,
      );
    }

    throw new ServiceUnavailableException(
      `Supabase referential table ${table} returned status ${response.status}.${suffix}`,
    );
  }

  private async readErrorPayload(
    response: Response,
  ): Promise<SupabaseErrorPayload> {
    try {
      return (await response.json()) as SupabaseErrorPayload;
    } catch {
      return {};
    }
  }
}
