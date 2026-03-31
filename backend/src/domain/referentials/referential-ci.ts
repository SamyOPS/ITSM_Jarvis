export class ReferentialCi {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly ciTypeId: string,
    public readonly status: string,
    public readonly assignedUserId: string | null,
    public readonly serialNumber: string | null,
  ) {}

  isAssigned(): boolean {
    return this.assignedUserId !== null;
  }
}
