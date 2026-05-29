export type PlanningTaskStatus = 'DONE' | 'TODO';

export class PlanningTask {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly technicianId: string,
    public readonly start: string,
    public readonly durationMinutes: number,
    public readonly status: PlanningTaskStatus,
    public readonly createdByUserId: string,
  ) {}
}
