import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { PlanningTask } from '../../../domain/planning/planning-task';
import {
  assertExistingPlanningTask,
  assertPlanningTaskWriteAccess,
  type PlanningTaskInput,
  validatePlanningTaskInput,
} from '../planning-task.validation';
import { PlanningTaskRepository } from '../repositories/planning-task.repository';

@Injectable()
export class UpdatePlanningTaskUseCase {
  constructor(private readonly repository: PlanningTaskRepository) {}

  async execute(
    id: string,
    input: PlanningTaskInput,
    userId: string,
    userRole: UserRole,
  ): Promise<PlanningTask> {
    const existingTask = assertExistingPlanningTask(
      await this.repository.findTaskById(id),
    );
    const actorGroupIds = await this.repository.listGroupIdsForUser(userId);
    const existingTechnicianGroupIds =
      await this.repository.listGroupIdsForUser(existingTask.technicianId);

    assertPlanningTaskWriteAccess(
      userId,
      userRole,
      existingTask.technicianId,
      existingTask.groupId,
      actorGroupIds,
      existingTechnicianGroupIds,
    );

    const validatedInput = validatePlanningTaskInput(input);
    const nextTechnicianGroupIds = await this.repository.listGroupIdsForUser(
      validatedInput.technicianId,
    );

    assertPlanningTaskWriteAccess(
      userId,
      userRole,
      validatedInput.technicianId,
      validatedInput.groupId,
      actorGroupIds,
      nextTechnicianGroupIds,
    );

    return this.repository.updateTask({
      id,
      ...validatedInput,
    });
  }
}
