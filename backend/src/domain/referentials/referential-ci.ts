import type { CiStatus } from '../ticketing/ci-status';

export class ReferentialCi {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly ciTypeId: string,
    public readonly status: CiStatus,
    public readonly assignedUserId: string | null,
    public readonly serialNumber: string | null,
    public readonly brand: string | null,
    public readonly model: string | null,
    public readonly operatingSystem: string | null,
    public readonly location: string | null,
    public readonly purchaseDate: string | null,
    public readonly warrantyEndDate: string | null,
    public readonly ipAddress: string | null,
    public readonly macAddress: string | null,
    public readonly cpuName: string | null,
    public readonly diskSpaceGb: number | null,
    public readonly ramMb: number | null,
    public readonly keyboardLayout: string | null,
    public readonly osVersion: string | null,
    public readonly price: number | null,
    public readonly comment: string | null,
    public readonly archivedAt: string | null,
    public readonly createdAt: string | null = null,
  ) {}

  isAssigned(): boolean {
    return this.assignedUserId !== null;
  }

  isArchived(): boolean {
    return this.archivedAt !== null;
  }
}
