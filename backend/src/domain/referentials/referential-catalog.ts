import { ReferentialCategory } from './referential-category';
import { ReferentialChannel } from './referential-channel';
import { ReferentialCiType } from './referential-ci-type';
import { ReferentialGroup } from './referential-group';
import { ReferentialPriority } from './referential-priority';
import { ReferentialService } from './referential-service';

export interface ReferentialCatalogSnapshot {
  categories: ReferentialCategory[];
  channels: ReferentialChannel[];
  ciTypes: ReferentialCiType[];
  groups: ReferentialGroup[];
  priorities: ReferentialPriority[];
  services: ReferentialService[];
}
