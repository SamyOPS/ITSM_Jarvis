import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

export type ParkPageProps = {
  ciId?: string;
  mode: 'CREATE' | 'DETAIL' | 'LIST';
  session: AuthSessionSnapshot;
};

export type EquipmentFilters = {
  search: string;
  searchField: 'ASSIGNED_USER' | 'BRAND' | 'MODEL' | 'NAME' | 'SERIAL_NUMBER';
  status: string;
  typeId: string;
};

export type EquipmentSortOption = 'CREATED_AT_ASC' | 'CREATED_AT_DESC';

export type EquipmentFormState = {
  archivedAt: string;
  assignedUserId: string;
  brand: string;
  comment: string;
  ciTypeId: string;
  cpuName: string;
  diskSpaceGb: string;
  keyboardLayout: string;
  location: string;
  model: string;
  name: string;
  operatingSystem: string;
  osVersion: string;
  price: string;
  purchaseDate: string;
  ramMb: string;
  serialNumber: string;
  status: string;
  warrantyEndDate: string;
};

export type UserLookupSearchField = 'FIRST_NAME' | 'IDENTIFIER' | 'LAST_NAME';

export type FilterInputChangeHandler = (
  setFilters: Dispatch<SetStateAction<EquipmentFilters>>,
  field: keyof EquipmentFilters,
) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

export type EquipmentFieldChangeHandler = (
  setEquipmentForm: Dispatch<SetStateAction<EquipmentFormState>>,
  field: keyof EquipmentFormState,
) => (
  event: ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => void;
