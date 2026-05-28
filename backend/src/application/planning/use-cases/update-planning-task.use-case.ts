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

    assertPlanningTaskWriteAccess(userId, userRole, existingTask.technicianId);

    const validatedInput = validatePlanningTaskInput(input);

    assertPlanningTaskWriteAccess(
      userId,
      userRole,
      validatedInput.technicianId,
    );

    return this.repository.updateTask({
      id,
      ...validatedInput,
    });
  }
}
