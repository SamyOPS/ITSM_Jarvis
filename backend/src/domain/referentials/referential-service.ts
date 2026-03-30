export class ReferentialService {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
  ) {}

  hasDescription(): boolean {
    return Boolean(this.description);
  }
}
