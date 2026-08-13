import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  isNotificationPreferenceKey,
  type NotificationPreferenceSnapshot,
} from '../../../domain/notifications/notification-preference';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class UpdateNotificationPreferenceUseCase {
  constructor(
    @Inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  execute(
    userId: string,
    preferenceKey: string,
    enabled: unknown,
  ): Promise<NotificationPreferenceSnapshot> {
    const normalizedUserId = userId.trim();
    const normalizedPreferenceKey = preferenceKey.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    if (!isNotificationPreferenceKey(normalizedPreferenceKey)) {
      throw new BadRequestException('preferenceKey is invalid.');
    }

    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean.');
    }

    return this.notificationRepository.updatePreference(
      normalizedUserId,
      normalizedPreferenceKey,
      enabled,
    );
  }
}
