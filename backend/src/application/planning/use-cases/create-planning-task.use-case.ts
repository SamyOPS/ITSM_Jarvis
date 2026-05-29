import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { PlanningTask } from '../../../domain/planning/planning-task';
import {
  assertPlanningTaskWriteAccess,
  type PlanningTaskInput,
  validatePlanningTaskInput,
} from '../planning-task.validation';
import { PlanningTaskRepository } from '../repositories/planning-task.repository';

@Injectable()
export class CreatePlanningTaskUseCase {
  constructor(private readonly repository: PlanningTaskRepository) {}

  execute(
    input: PlanningTaskInput,
    userId: string,
    userRole: UserRole,
  ): Promise<PlanningTask> {
    const validatedInput = validatePlanningTaskInput(input);

    assertPlanningTaskWriteAccess(
      userId,
      userRole,
      validatedInput.technicianId,
    );

    return this.repository.createTask({
      ...validatedInput,
      createdByUserId: userId,
    });
  }
}
