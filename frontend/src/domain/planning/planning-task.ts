export type PlanningTask = {
  createdByUserId?: string;
  description: string;
  durationMinutes: number;
  groupId?: string | null;
  id: string;
  start: string;
  status: 'DONE' | 'TODO';
  technicianId: string;
  title: string;
};

export type SavePlanningTaskPayload = Omit<
  PlanningTask,
  'createdByUserId' | 'id'
>;
