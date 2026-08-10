import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { ReferentialCi } from '../../domain/referentials/referential-catalog';
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

    if (!normalizedSearch) {
      return true;
    }

    const assignedUser = ci.assignedUserId
      ? (usersById.get(ci.assignedUserId) ?? null)
      : null;
    const searchValues: Record<EquipmentFilters['searchField'], string> = {
      ASSIGNED_USER: assignedUser ? formatUserName(assignedUser) : '',
      BRAND: ci.brand ?? '',
      MODEL: ci.model ?? '',
      NAME: ci.name,
      SERIAL_NUMBER: ci.serialNumber ?? '',
    };

    return searchValues[filters.searchField]
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

export function toTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function buildCiPayload(
  form: EquipmentFormState,
): Record<string, unknown> {
  return {
    name: form.name.trim(),
    ciTypeId: form.ciTypeId,
    status: form.status,
    assignedUserId: normalizeOptionalText(form.assignedUserId),
    serialNumber: normalizeOptionalText(form.serialNumber),
    brand: normalizeOptionalText(form.brand),
    model: normalizeOptionalText(form.model),
    operatingSystem: normalizeOptionalText(form.operatingSystem),
    location: normalizeOptionalText(form.location),
    purchaseDate: normalizeOptionalText(form.purchaseDate),
    warrantyEndDate: normalizeOptionalText(form.warrantyEndDate),
    cpuName: normalizeOptionalText(form.cpuName),
    diskSpaceGb: normalizeOptionalNumber(form.diskSpaceGb),
    ramMb: normalizeOptionalNumber(form.ramMb),
    keyboardLayout: normalizeOptionalText(form.keyboardLayout),
    osVersion: normalizeOptionalText(form.osVersion),
    price: normalizeOptionalNumber(form.price),
    comment: normalizeOptionalText(form.comment),
    archivedAt: normalizeOptionalText(form.archivedAt),
  };
}

export function mapEquipmentToForm(ci: ReferentialCi): EquipmentFormState {
  return {
    archivedAt: ci.archivedAt ?? '',
    assignedUserId: ci.assignedUserId ?? '',
    brand: ci.brand ?? '',
    comment: ci.comment ?? '',
    ciTypeId: ci.ciTypeId,
    cpuName: ci.cpuName ?? '',
    diskSpaceGb: ci.diskSpaceGb === null ? '' : String(ci.diskSpaceGb),
    keyboardLayout: ci.keyboardLayout ?? '',
    location: ci.location ?? '',
    model: ci.model ?? '',
    name: ci.name,
    operatingSystem: ci.operatingSystem ?? '',
    osVersion: ci.osVersion ?? '',
    price: ci.price === null ? '' : String(ci.price),
    purchaseDate: ci.purchaseDate ?? '',
    ramMb: ci.ramMb === null ? '' : String(ci.ramMb),
    serialNumber: ci.serialNumber ?? '',
    status: ci.status,
    warrantyEndDate: ci.warrantyEndDate ?? '',
  };
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
