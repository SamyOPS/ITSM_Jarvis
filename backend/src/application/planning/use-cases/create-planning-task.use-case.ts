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

  async execute(
    input: PlanningTaskInput,
    userId: string,
    userRole: UserRole,
  ): Promise<PlanningTask> {
    const validatedInput = validatePlanningTaskInput(input);
    const [actorGroupIds, technicianGroupIds] = await Promise.all([
      this.repository.listGroupIdsForUser(userId),
      this.repository.listGroupIdsForUser(validatedInput.technicianId),
    ]);

    assertPlanningTaskWriteAccess(
      userId,
      userRole,
      validatedInput.technicianId,
      validatedInput.groupId,
      actorGroupIds,
      technicianGroupIds,
    );

    return this.repository.createTask({
      ...validatedInput,
      createdByUserId: userId,
    });
  }
}
