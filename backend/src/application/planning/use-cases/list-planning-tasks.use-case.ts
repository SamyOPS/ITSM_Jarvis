import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { PlanningTask } from '../../../domain/planning/planning-task';
import { PlanningTaskRepository } from '../repositories/planning-task.repository';

@Injectable()
export class ListPlanningTasksUseCase {
  constructor(private readonly repository: PlanningTaskRepository) {}

  execute(userId: string, userRole: UserRole): Promise<PlanningTask[]> {
    if (userRole === UserRole.ADMIN) {
      return this.repository.listTasks();
    }

    return this.repository.listTasksForTechnicianAndGroups(userId);
  }
}
