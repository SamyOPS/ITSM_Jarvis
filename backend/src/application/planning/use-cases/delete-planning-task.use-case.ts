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
    const [actorGroupIds, technicianGroupIds] = await Promise.all([
      this.repository.listGroupIdsForUser(userId),
      this.repository.listGroupIdsForUser(existingTask.technicianId),
    ]);

    assertPlanningTaskWriteAccess(
      userId,
      userRole,
      existingTask.technicianId,
      existingTask.groupId,
      actorGroupIds,
      technicianGroupIds,
    );

    await this.repository.deleteTask(id);
  }
}
