import { type PriorityName } from '../ticketing/priority-name';

export interface Priority {
  createdAt: string;
  id: string;
  level: number;
  name: PriorityName;
  resolutionHours: number | null;
  responseHours: number | null;
  updatedAt: string;
}
