import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { GetNotificationPreferencesUseCase } from '../../../application/notifications/use-cases/get-notification-preferences.use-case';
import { ListNotificationsUseCase } from '../../../application/notifications/use-cases/list-notifications.use-case';
import { DeleteNotificationUseCase } from '../../../application/notifications/use-cases/delete-notification.use-case';
import { DeleteAllNotificationsUseCase } from '../../../application/notifications/use-cases/delete-all-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../../../application/notifications/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../../../application/notifications/use-cases/mark-notification-read.use-case';
import { UpdateNotificationPreferenceUseCase } from '../../../application/notifications/use-cases/update-notification-preference.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { Notification } from '../../../domain/notifications/notification';
import { type NotificationPreferenceSnapshot } from '../../../domain/notifications/notification-preference';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

type UpdateNotificationPreferenceBody = {
  enabled?: unknown;
};

@Controller('notifications')
@UseGuards(BearerAuthGuard)
export class NotificationsController {
  constructor(
    private readonly deleteAllNotificationsUseCase: DeleteAllNotificationsUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
    private readonly getNotificationPreferencesUseCase: GetNotificationPreferencesUseCase,
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly updateNotificationPreferenceUseCase: UpdateNotificationPreferenceUseCase,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Notification[]> {
    return this.listNotificationsUseCase.execute(user.id);
  }

  @Get('preferences')
  preferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceSnapshot> {
    return this.getNotificationPreferencesUseCase.execute(user.id);
  }

  @Patch('preferences/:preferenceKey')
  updatePreference(
    @Param('preferenceKey') preferenceKey: string,
    @Body() body: UpdateNotificationPreferenceBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceSnapshot> {
    return this.updateNotificationPreferenceUseCase.execute(
      user.id,
      preferenceKey,
      body.enabled,
    );
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
