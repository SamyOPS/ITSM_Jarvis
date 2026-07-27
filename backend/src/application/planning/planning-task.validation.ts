import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  isSupportManagerRole,
  isSupportRole,
  UserRole,
} from '../../domain/auth/user-role';
import {
  PlanningTask,
  type PlanningTaskStatus,
} from '../../domain/planning/planning-task';

export type PlanningTaskInput = {
  description?: unknown;
  durationMinutes?: unknown;
  groupId?: unknown;
  start?: unknown;
  status?: unknown;
  technicianId?: unknown;
  title?: unknown;
};

export type ValidPlanningTaskInput = {
  description: string;
  durationMinutes: number;
  groupId: string | null;
  start: string;
  status: PlanningTaskStatus;
  technicianId: string;
  title: string;
};

export function validatePlanningTaskInput(
  input: PlanningTaskInput,
): ValidPlanningTaskInput {
  const title = normalizeRequiredText(input.title, 'title');
  const technicianId = normalizeRequiredText(
    input.technicianId,
    'technicianId',
  );
  const start = normalizeRequiredText(input.start, 'start');
  const description = normalizeOptionalText(input.description);
  const durationMinutes = normalizeDuration(input.durationMinutes);
  const groupId = normalizeOptionalId(input.groupId, 'groupId');
  const status = normalizeStatus(input.status);

  if (Number.isNaN(Date.parse(start))) {
    throw new BadRequestException('start must be a valid date time.');
  }

  return {
    description,
    durationMinutes,
    groupId,
    start,
    status,
    technicianId,
    title,
  };
}

export function assertPlanningTaskWriteAccess(
  userId: string,
  userRole: UserRole,
  technicianId: string,
  groupId: string | null,
  actorGroupIds: string[] = [],
  technicianGroupIds: string[] = [],
): void {
  if (isSupportManagerRole(userRole)) {
    return;
  }

  if (isSupportRole(userRole) && technicianId === userId) {
    return;
  }

  if (
    isSupportRole(userRole) &&
    groupId &&
    actorGroupIds.includes(groupId) &&
    technicianGroupIds.includes(groupId)
  ) {
    return;
  }

  throw new ForbiddenException('Planning task access denied.');
}

export function assertExistingPlanningTask(
  task: PlanningTask | null,
): PlanningTask {
  if (!task) {
    throw new NotFoundException('Planning task not found.');
  }

  return task;
}

function normalizeRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`${field} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('description must be a string.');
  }

  return value.trim();
}

function normalizeOptionalId(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string.`);
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function normalizeDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(
      'durationMinutes must be a positive integer.',
    );
  }

  return value;
}

function normalizeStatus(value: unknown): PlanningTaskStatus {
  if (value === 'DONE' || value === 'TODO') {
    return value;
  }

  throw new BadRequestException('status must be one of TODO or DONE.');
}
