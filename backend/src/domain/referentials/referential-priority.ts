import { PriorityName } from '../ticketing/priority-name';

export interface ReferentialPriority {
  id: string;
  level: number;
  name: PriorityName;
  resolutionHours: number | null;
  responseHours: number | null;
}
