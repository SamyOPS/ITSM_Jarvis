import { Injectable } from '@nestjs/common';
import { isAdminRole, UserRole } from '../../../domain/auth/user-role';
import { PlanningTask } from '../../../domain/planning/planning-task';
import { PlanningTaskRepository } from '../repositories/planning-task.repository';

@Injectable()
export class ListPlanningTasksUseCase {
  constructor(private readonly repository: PlanningTaskRepository) {}

  execute(userId: string, userRole: UserRole): Promise<PlanningTask[]> {
    if (isAdminRole(userRole)) {
      return this.repository.listTasks();
    }

    return this.repository.listTasksForTechnicianAndGroups(userId);
  }
}
