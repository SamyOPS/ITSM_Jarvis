import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateGroupChatMessageUseCase } from '../../../application/group-chat/use-cases/create-group-chat-message.use-case';
import { ListGroupChatMessagesUseCase } from '../../../application/group-chat/use-cases/list-group-chat-messages.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { UserRole } from '../../../domain/auth/user-role';
import { GroupChatMessage } from '../../../domain/group-chat/group-chat-message';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

type GroupChatMessageBodyDto = {
  body?: unknown;
};

@Controller('groups/:groupId/chat/messages')
@UseGuards(BearerAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN)
export class GroupChatController {
  constructor(
    private readonly createGroupChatMessageUseCase: CreateGroupChatMessageUseCase,
    private readonly listGroupChatMessagesUseCase: ListGroupChatMessagesUseCase,
  ) {}

  @Get()
  listMessages(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GroupChatMessage[]> {
    return this.listGroupChatMessagesUseCase.execute(
      groupId,
      user.id,
      user.role,
    );
  }

  @Post()
  createMessage(
    @Param('groupId') groupId: string,
    @Body() body: GroupChatMessageBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GroupChatMessage> {
    return this.createGroupChatMessageUseCase.execute(
      groupId,
      {
        body: body.body,
      },
      user.id,
      user.role,
    );
  }
}
