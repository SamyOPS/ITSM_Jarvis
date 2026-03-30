export class ReferentialCategory {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly parentId: string | null,
  ) {}

  isRootCategory(): boolean {
    return this.parentId === null;
  }
}
