import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_PRIORITY_NAMES,
  type PriorityName,
} from '../../domain/ticketing/priority-name';
import {
  DEFAULT_SUPPORT_LEVELS,
  type SupportLevel,
} from '../../domain/ticketing/support-level';
import {
  DEFAULT_CI_STATUSES,
  type CiStatus,
} from '../../domain/ticketing/ci-status';

export function assertNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new BadRequestException(`${fieldName} must not be blank.`);
  }

  return normalized;
}

export function normalizeNullableText(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

export function assertUuidLike(value: string, fieldName: string): string {
  const normalized = assertNonBlank(value, fieldName);
  const uuidLikePattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidLikePattern.test(normalized)) {
    throw new BadRequestException(`${fieldName} must be a valid UUID.`);
  }

  return normalized;
}

export function assertSupportLevel(
  value: SupportLevel | null,
): SupportLevel | null {
  if (value === null) {
    return null;
  }

  if (!DEFAULT_SUPPORT_LEVELS.includes(value)) {
    throw new BadRequestException('level must be one of N1, N2 or N3.');
  }

  return value;
}

export function assertPriorityName(value: PriorityName): PriorityName {
  if (!DEFAULT_PRIORITY_NAMES.includes(value)) {
    throw new BadRequestException(
      'priority name must be one of LOW, MEDIUM, HIGH or CRITICAL.',
    );
  }

  return value;
}

export function assertCiStatus(value: CiStatus): CiStatus {
  if (!DEFAULT_CI_STATUSES.includes(value)) {
    throw new BadRequestException(
      'CI status must be one of IN_SERVICE, MAINTENANCE or OUT_OF_SERVICE.',
    );
  }

  return value;
}

export function assertPositiveInteger(
  value: number,
  fieldName: string,
): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  return value;
}

export function assertNullableNonNegativeInteger(
  value: number | null,
  fieldName: string,
): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(
      `${fieldName} must be null or a non-negative integer.`,
    );
  }

  return value;
}

export function assertSlaOrder(
  responseHours: number | null,
  resolutionHours: number | null,
): void {
  if (
    responseHours !== null &&
    resolutionHours !== null &&
    resolutionHours < responseHours
  ) {
    throw new BadRequestException(
      'resolutionHours must be greater than or equal to responseHours.',
    );
  }
}
