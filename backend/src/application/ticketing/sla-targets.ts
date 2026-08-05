import { ReferentialPriority } from '../../domain/referentials/referential-priority';

export type SlaTargets = {
  resolutionDueAt: string | null;
  responseDueAt: string | null;
};

const VIP_TTR_MULTIPLIER = 0.75;

export function calculateSlaTargets(
  priority: ReferentialPriority,
  baseDate = new Date(),
  options: { isRequesterVip?: boolean } = {},
): SlaTargets {
  return {
    resolutionDueAt: addHours(
      baseDate,
      getResolutionHours(priority.resolutionHours, options.isRequesterVip),
    ),
    responseDueAt: addHours(baseDate, priority.responseHours),
  };
}

export function getResolutionHours(
  resolutionHours: number | null | undefined,
  isRequesterVip = false,
): number | null {
  if (resolutionHours === null || resolutionHours === undefined) {
    return null;
  }

  return isRequesterVip ? resolutionHours * VIP_TTR_MULTIPLIER : resolutionHours;
}

function addHours(baseDate: Date, hours: number | null): string | null {
  if (hours === null) {
    return null;
  }

  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000).toISOString();
}
