import { ReferentialCategory } from './referential-category';
import { ReferentialChannel } from './referential-channel';
import { ReferentialCi } from './referential-ci';
import { ReferentialCiType } from './referential-ci-type';
import { ReferentialGroup } from './referential-group';
import { ReferentialPriority } from './referential-priority';

export interface ReferentialCatalogSnapshot {
  categories: ReferentialCategory[];
  channels: ReferentialChannel[];
  cis: ReferentialCi[];
  ciTypes: ReferentialCiType[];
  groups: ReferentialGroup[];
  priorities: ReferentialPriority[];
}
