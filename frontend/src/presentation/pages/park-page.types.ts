import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

export type ParkPageProps = {
  mode: 'CREATE' | 'LIST';
  session: AuthSessionSnapshot;
};

export type EquipmentFilters = {
  assignedUserId: string;
  brand: string;
  location: string;
  search: string;
  status: string;
  typeId: string;
};

export type EquipmentFormState = {
  archivedAt: string;
  assignedUserId: string;
  brand: string;
  comment: string;
  ciTypeId: string;
  ipAddress: string;
  location: string;
  macAddress: string;
  model: string;
  name: string;
  purchaseDate: string;
  serialNumber: string;
  status: string;
  warrantyEndDate: string;
};

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
