import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import type { EquipmentFilters, EquipmentFormState } from './park-page.types';

export const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
};

export const INITIAL_FILTERS: EquipmentFilters = {
  assignedUserId: '',
  brand: '',
  location: '',
  search: '',
  status: '',
  typeId: '',
};

export const EMPTY_EQUIPMENT_FORM: EquipmentFormState = {
  archivedAt: '',
  assignedUserId: '',
  brand: '',
  comment: '',
  ciTypeId: '',
  cpuName: '',
  diskSpaceGb: '',
  keyboardLayout: '',
  location: '',
  model: '',
  name: '',
  operatingSystem: '',
  osVersion: '',
  purchaseDate: '',
  ramMb: '',
  serialNumber: '',
  status: 'IN_SERVICE',
  warrantyEndDate: '',
};

export const CI_STATUS_OPTIONS = [
  'IN_SERVICE',
  'IN_STOCK',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
  'LOST',
  'RETIRED',
  'ARCHIVED',
] as const;

export const PARK_CI_TYPE_NAMES = [
  'Ordinateur',
  'Serveur',
  'Imprimante',
  'Ecran',
  'Reseau',
  'Logiciel',
  'Peripherique',
  'Consommable',
  'Cable',
  'Telephone',
  'Autre',
] as const;

export const PARK_PAGE_COPY = {
  description:
    'Consulte les equipements, leur affectation, leur statut et les principales informations techniques.',
  title: 'Equipements',
};
