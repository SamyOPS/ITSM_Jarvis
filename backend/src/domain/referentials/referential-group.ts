import { SupportLevel } from '../ticketing/support-level';

export interface ReferentialGroup {
  description: string | null;
  id: string;
  level: SupportLevel | null;
  name: string;
}
