import { PriorityName } from '../ticketing/priority-name';

export class ReferentialPriority {
  constructor(
    public readonly id: string,
    public readonly name: PriorityName,
    public readonly level: number,
    public readonly responseHours: number | null,
    public readonly resolutionHours: number | null,
  ) {}

  hasResponseSla(): boolean {
    return this.responseHours !== null;
  }

  hasResolutionSla(): boolean {
    return this.resolutionHours !== null;
  }
}
