import { ReferentialPriority } from '../../domain/referentials/referential-priority';

export type SlaTargets = {
  resolutionDueAt: string | null;
  responseDueAt: string | null;
};

export function calculateSlaTargets(
  priority: ReferentialPriority,
  baseDate = new Date(),
): SlaTargets {
  return {
    resolutionDueAt: addHours(baseDate, priority.resolutionHours),
    responseDueAt: addHours(baseDate, priority.responseHours),
  };
}

function addHours(baseDate: Date, hours: number | null): string | null {
  if (hours === null) {
    return null;
  }

  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000).toISOString();
}
