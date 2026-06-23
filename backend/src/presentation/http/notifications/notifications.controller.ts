import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ListNotificationsUseCase } from '../../../application/notifications/use-cases/list-notifications.use-case';
import { DeleteNotificationUseCase } from '../../../application/notifications/use-cases/delete-notification.use-case';
import { DeleteAllNotificationsUseCase } from '../../../application/notifications/use-cases/delete-all-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../../../application/notifications/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../../../application/notifications/use-cases/mark-notification-read.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { Notification } from '../../../domain/notifications/notification';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notifications')
@UseGuards(BearerAuthGuard)
export class NotificationsController {
  constructor(
    private readonly deleteAllNotificationsUseCase: DeleteAllNotificationsUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Notification[]> {
    return this.listNotificationsUseCase.execute(user.id);
  }

  @Patch('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.markAllNotificationsReadUseCase.execute(user.id);
  }

  @Patch(':notificationId/read')
  @HttpCode(204)
  async markRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.markNotificationReadUseCase.execute(notificationId, user.id);
  }

  @Delete(':notificationId')
  @HttpCode(204)
  async delete(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteNotificationUseCase.execute(notificationId, user.id);
  }

  @Delete()
  @HttpCode(204)
  async deleteAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.deleteAllNotificationsUseCase.execute(user.id);
  }
}
