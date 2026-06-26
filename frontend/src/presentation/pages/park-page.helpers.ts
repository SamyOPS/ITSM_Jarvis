import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type {
  ReferentialCi,
  ReferentialCiType,
} from '../../domain/referentials/referential-catalog';
import type { EquipmentFilters, EquipmentFormState } from './park-page.types';

export function handleFilterInput(
  setFilters: Dispatch<SetStateAction<EquipmentFilters>>,
  field: keyof EquipmentFilters,
) {
  return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };
}

export function handleEquipmentFieldChange(
  setEquipmentForm: Dispatch<SetStateAction<EquipmentFormState>>,
  field: keyof EquipmentFormState,
) {
  return (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const value = event.target.value;
    setEquipmentForm((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };
}

export function filterEquipment(
  cis: ReferentialCi[],
  filters: EquipmentFilters,
  ciTypesById: Map<string, ReferentialCiType>,
  usersById: Map<string, AdminUserSummary>,
): ReferentialCi[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return cis.filter((ci) => {
    if (filters.typeId && ci.ciTypeId !== filters.typeId) {
      return false;
    }

    if (filters.status && ci.status !== filters.status) {
      return false;
    }

    if (filters.brand && ci.brand !== filters.brand) {
      return false;
    }

    if (filters.location && ci.location !== filters.location) {
      return false;
    }

    if (
      filters.assignedUserId === '__UNASSIGNED__' &&
      ci.assignedUserId !== null
    ) {
      return false;
    }

    if (
      filters.assignedUserId &&
      filters.assignedUserId !== '__UNASSIGNED__' &&
      ci.assignedUserId !== filters.assignedUserId
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const assignedUser = ci.assignedUserId
      ? (usersById.get(ci.assignedUserId) ?? null)
      : null;
    const searchValue = [
      ci.name,
      ci.brand,
      ci.model,
      ci.serialNumber,
      ci.operatingSystem,
      ci.cpuName,
      ci.diskSpaceGb === null ? '' : String(ci.diskSpaceGb),
      ci.ramMb === null ? '' : String(ci.ramMb),
      ci.keyboardLayout,
      ci.osVersion,
      ci.location,
      ciTypeById(ciTypesById, ci.ciTypeId),
      assignedUser ? formatUserName(assignedUser) : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchValue.includes(normalizedSearch);
  });
}

function ciTypeById(
  ciTypesById: Map<string, ReferentialCiType>,
  ciTypeId: string,
): string {
  return ciTypesById.get(ciTypeId)?.name ?? '';
}

export function buildEquipmentSubtitle(ci: ReferentialCi): string {
  const parts = [ci.brand, ci.model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Equipement non detaille';
}

export function formatEquipmentIdentifier(ci: ReferentialCi): string {
  const suffix = ci.id.slice(0, 8).toUpperCase();
  return `EQ-${suffix}`;
}

export function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || user.id;
}

export function buildUniqueValues(values: Array<string | null>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort((left, right) => left.localeCompare(right, 'fr'));
}

export function formatDateValue(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR').format(date);
}

export function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeOptionalNumber(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsedValue = Number(normalized);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
