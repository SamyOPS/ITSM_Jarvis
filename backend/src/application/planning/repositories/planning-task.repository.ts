import { PlanningTask } from '../../../domain/planning/planning-task';

export type CreatePlanningTaskRecord = {
  createdByUserId: string;
  description: string;
  durationMinutes: number;
  groupId: string | null;
  start: string;
  status: 'DONE' | 'TODO';
  technicianId: string;
  title: string;
};

export type UpdatePlanningTaskRecord = {
  description: string;
  durationMinutes: number;
  groupId: string | null;
  id: string;
  start: string;
  status: 'DONE' | 'TODO';
  technicianId: string;
  title: string;
};

export abstract class PlanningTaskRepository {
  abstract createTask(command: CreatePlanningTaskRecord): Promise<PlanningTask>;

  abstract deleteTask(id: string): Promise<void>;

  abstract findTaskById(id: string): Promise<PlanningTask | null>;

  abstract listTasks(): Promise<PlanningTask[]>;

  abstract listTasksForTechnician(
    technicianId: string,
  ): Promise<PlanningTask[]>;

  abstract listGroupIdsForUser(userId: string): Promise<string[]>;

  abstract listTasksForTechnicianAndGroups(
    technicianId: string,
  ): Promise<PlanningTask[]>;

  abstract updateTask(command: UpdatePlanningTaskRecord): Promise<PlanningTask>;
}
