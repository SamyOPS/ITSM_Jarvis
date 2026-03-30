import { SupportLevel } from '../ticketing/support-level';

export class ReferentialGroup {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly level: SupportLevel | null,
  ) {}

  hasSupportLevel(): boolean {
    return this.level !== null;
  }
}
