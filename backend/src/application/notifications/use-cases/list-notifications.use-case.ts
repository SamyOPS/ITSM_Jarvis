import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Notification } from '../../../domain/notifications/notification';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  execute(userId: string): Promise<Notification[]> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    return this.notificationRepository.listForUser(normalizedUserId, 30);
  }
}
