import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type CreatePlanningTaskRecord,
  PlanningTaskRepository,
  type UpdatePlanningTaskRecord,
} from '../../application/planning/repositories/planning-task.repository';
import { PlanningTask } from '../../domain/planning/planning-task';
import { getBackendRuntimeConfig } from '../config/app-config';

type SupabasePlanningTaskRow = {
  created_by_user_id: string;
  description: string;
  duration_minutes: number;
  id: string;
  start_at: string;
  status: 'DONE' | 'TODO';
  technician_id: string;
  title: string;
};

type MutationFilter = { column: string; value: string };

const PLANNING_TASK_SELECT =
  'id,title,description,technician_id,start_at,duration_minutes,status,created_by_user_id';

@Injectable()
export class SupabasePlanningTaskRepository implements PlanningTaskRepository {
  async listTasks(): Promise<PlanningTask[]> {
    const rows = await this.fetchRows();

    return rows.map((row) => this.mapRow(row));
  }

  async listTasksForTechnician(technicianId: string): Promise<PlanningTask[]> {
    const rows = await this.fetchRows([
      { column: 'technician_id', value: technicianId },
    ]);

    return rows.map((row) => this.mapRow(row));
  }

  async findTaskById(id: string): Promise<PlanningTask | null> {
    const rows = await this.fetchRows([{ column: 'id', value: id }]);

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async createTask(command: CreatePlanningTaskRecord): Promise<PlanningTask> {
    const rows = await this.mutateRows('POST', {
      created_by_user_id: command.createdByUserId,
      description: command.description,
      duration_minutes: command.durationMinutes,
      start_at: command.start,
      status: command.status,
      technician_id: command.technicianId,
      title: command.title,
    });

    return this.expectSingle(rows);
  }

  async updateTask(command: UpdatePlanningTaskRecord): Promise<PlanningTask> {
    const rows = await this.mutateRows(
      'PATCH',
      {
        description: command.description,
        duration_minutes: command.durationMinutes,
        start_at: command.start,
        status: command.status,
        technician_id: command.technicianId,
        title: command.title,
        updated_at: new Date().toISOString(),
      },
      [{ column: 'id', value: command.id }],
    );

    return this.expectSingle(rows, command.id);
  }

  async deleteTask(id: string): Promise<void> {
    const url = this.buildUrl([{ column: 'id', value: id }]);
    const response = await this.executeRequest(url, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    const rows = (await response.json()) as SupabasePlanningTaskRow[];
    if (rows.length === 0) {
      throw new NotFoundException('Planning task not found.');
    }
  }

  private async fetchRows(
    filters: readonly MutationFilter[] = [],
  ): Promise<SupabasePlanningTaskRow[]> {
    const url = this.buildUrl(filters);
    url.searchParams.set('order', 'start_at.asc');

    const response = await this.executeRequest(url);

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    return (await response.json()) as SupabasePlanningTaskRow[];
  }

  private async mutateRows(
    method: 'PATCH' | 'POST',
    body: Record<string, unknown>,
    filters: readonly MutationFilter[] = [],
  ): Promise<SupabasePlanningTaskRow[]> {
    const url = this.buildUrl(filters);
    const response = await this.executeRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response);
    }

    return (await response.json()) as SupabasePlanningTaskRow[];
  }

  private buildUrl(filters: readonly MutationFilter[] = []): URL {
    const config = getBackendRuntimeConfig();

    if (!config.supabaseUrl) {
      throw new ServiceUnavailableException(
        'Supabase planning configuration is incomplete on the backend.',
      );
    }

    const url = new URL(`${config.supabaseUrl}/rest/v1/planning_tasks`);
    url.searchParams.set('select', PLANNING_TASK_SELECT);

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
        'Supabase planning configuration is incomplete on the backend.',
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
        'Supabase planning service is unreachable from the backend.',
      );
    }
  }

  private expectSingle(
    rows: SupabasePlanningTaskRow[],
    id?: string,
  ): PlanningTask {
    if (rows.length === 0) {
      if (id) {
        throw new NotFoundException('Planning task not found.');
      }

      throw new ServiceUnavailableException(
        'Supabase planning mutation returned no representation.',
      );
    }

    return this.mapRow(rows[0]);
  }

  private mapRow(row: SupabasePlanningTaskRow): PlanningTask {
    return new PlanningTask(
      row.id,
      row.title,
      row.description,
      row.technician_id,
      row.start_at.slice(0, 16),
      row.duration_minutes,
      row.status,
      row.created_by_user_id,
    );
  }

  private async throwSupabaseError(response: Response): Promise<never> {
    const message = await response.text();

    throw new ServiceUnavailableException(
      message || `Supabase planning table returned status ${response.status}.`,
    );
  }
}
