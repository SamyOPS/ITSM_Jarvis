import type {
  PlanningTask,
  SavePlanningTaskPayload,
} from '../../domain/planning/planning-task';
import { getFrontendRuntimeConfig } from '../config/env';

export async function fetchPlanningTasks(
  accessToken: string,
): Promise<PlanningTask[]> {
  return requestPlanning<PlanningTask[]>('/planning/tasks', accessToken);
}

export async function createPlanningTask(
  accessToken: string,
  payload: SavePlanningTaskPayload,
): Promise<PlanningTask> {
  return requestPlanning<PlanningTask>('/planning/tasks', accessToken, {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function updatePlanningTask(
  accessToken: string,
  taskId: string,
  payload: SavePlanningTaskPayload,
): Promise<PlanningTask> {
  return requestPlanning<PlanningTask>(
    `/planning/tasks/${taskId}`,
    accessToken,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
    },
  );
}

export async function deletePlanningTask(
  accessToken: string,
  taskId: string,
): Promise<void> {
  await requestPlanning<void>(`/planning/tasks/${taskId}`, accessToken, {
    method: 'DELETE',
  });
}

async function requestPlanning<T>(
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
        `La synchronisation du planning a echoue avec le statut ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
