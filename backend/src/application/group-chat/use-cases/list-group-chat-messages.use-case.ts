import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { GroupChatMessage } from '../../../domain/group-chat/group-chat-message';
import { GroupChatMessageRepository } from '../repositories/group-chat-message.repository';

@Injectable()
export class ListGroupChatMessagesUseCase {
  constructor(
    @Inject(GroupChatMessageRepository)
    private readonly groupChatMessageRepository: GroupChatMessageRepository,
  ) {}

  async execute(
    groupId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<GroupChatMessage[]> {
    const normalizedGroupId = groupId.trim();
    const normalizedUserId = userId.trim();

    if (!normalizedGroupId) {
      throw new BadRequestException('groupId is required.');
    }

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    if (userRole === UserRole.DEMANDEUR) {
      throw new ForbiddenException('Demandeur users cannot access group chat.');
    }

    await this.assertUserCanAccessGroup(normalizedUserId, normalizedGroupId);

    return this.groupChatMessageRepository.listMessages(normalizedGroupId);
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
