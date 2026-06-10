export class GroupChatMessage {
  constructor(
    public readonly id: string,
    public readonly groupId: string,
    public readonly authorUserId: string,
    public readonly body: string,
    public readonly createdAt: string,
  ) {}
}
