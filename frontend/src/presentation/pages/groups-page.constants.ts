import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import type { GroupFormState } from './groups-page.types';

export const GROUPS_PER_PAGE = 15;
export const GROUP_NAME_MAX_LENGTH = 40;
export const MEMBERS_PER_PAGE = 5;

export const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
};

export const EMPTY_GROUP_FORM: GroupFormState = {
  description: '',
  name: '',
};
