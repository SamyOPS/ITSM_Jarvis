import { type SupportLevel } from '../ticketing/support-level';

export interface SupportGroup {
  createdAt: string;
  description: string | null;
  id: string;
  level: SupportLevel;
  name: string;
  updatedAt: string;
}
