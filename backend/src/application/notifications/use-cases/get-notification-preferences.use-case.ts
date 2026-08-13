import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type NotificationPreferenceSnapshot } from '../../../domain/notifications/notification-preference';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    @Inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  execute(userId: string): Promise<NotificationPreferenceSnapshot> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    return this.notificationRepository.getPreferences(normalizedUserId);
  }
}
