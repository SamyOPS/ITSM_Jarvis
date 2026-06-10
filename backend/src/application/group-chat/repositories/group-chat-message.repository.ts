import { GroupChatMessage } from '../../../domain/group-chat/group-chat-message';

export type CreateGroupChatMessageRecord = {
  authorUserId: string;
  body: string;
  groupId: string;
};

export abstract class GroupChatMessageRepository {
  abstract createMessage(
    record: CreateGroupChatMessageRecord,
  ): Promise<GroupChatMessage>;

  abstract listGroupIdsForUser(userId: string): Promise<string[]>;

  abstract listMessages(groupId: string): Promise<GroupChatMessage[]>;
}
