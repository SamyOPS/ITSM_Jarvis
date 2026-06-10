import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { GroupChatMessage } from '../../../domain/group-chat/group-chat-message';
import { GroupChatMessageRepository } from '../repositories/group-chat-message.repository';

export type CreateGroupChatMessageCommand = {
  body: unknown;
};

@Injectable()
export class CreateGroupChatMessageUseCase {
  constructor(
    @Inject(GroupChatMessageRepository)
    private readonly groupChatMessageRepository: GroupChatMessageRepository,
  ) {}

  async execute(
    groupId: string,
    command: CreateGroupChatMessageCommand,
    userId: string,
    userRole: UserRole,
  ): Promise<GroupChatMessage> {
    const normalizedGroupId = groupId.trim();
    const normalizedUserId = userId.trim();
    const body = normalizeMessageBody(command.body);

    if (!normalizedGroupId) {
      throw new BadRequestException('groupId is required.');
    }

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    if (!body) {
      throw new BadRequestException('body is required.');
    }

    if (userRole === UserRole.DEMANDEUR) {
      throw new ForbiddenException('Demandeur users cannot access group chat.');
    }

    await this.assertUserCanAccessGroup(normalizedUserId, normalizedGroupId);

    return this.groupChatMessageRepository.createMessage({
      authorUserId: normalizedUserId,
      body,
      groupId: normalizedGroupId,
    });
  }

  private async assertUserCanAccessGroup(
    userId: string,
    groupId: string,
  ): Promise<void> {
    const groupIds =
      await this.groupChatMessageRepository.listGroupIdsForUser(userId);

    if (!groupIds.includes(groupId)) {
      throw new ForbiddenException('User does not belong to this group.');
    }
  }
}

function normalizeMessageBody(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
