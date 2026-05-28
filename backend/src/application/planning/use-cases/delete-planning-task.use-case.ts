import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import {
  assertExistingPlanningTask,
  assertPlanningTaskWriteAccess,
} from '../planning-task.validation';
import { PlanningTaskRepository } from '../repositories/planning-task.repository';

@Injectable()
export class DeletePlanningTaskUseCase {
  constructor(private readonly repository: PlanningTaskRepository) {}

  async execute(id: string, userId: string, userRole: UserRole): Promise<void> {
    const existingTask = assertExistingPlanningTask(
      await this.repository.findTaskById(id),
    );

    assertPlanningTaskWriteAccess(userId, userRole, existingTask.technicianId);

    await this.repository.deleteTask(id);
  }
}
