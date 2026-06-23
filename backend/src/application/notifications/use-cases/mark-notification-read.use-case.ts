import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    const normalizedNotificationId = notificationId.trim();
    const normalizedUserId = userId.trim();

    if (!normalizedNotificationId || !normalizedUserId) {
      throw new BadRequestException('notificationId and userId are required.');
    }

    await this.notificationRepository.markRead(
      normalizedNotificationId,
      normalizedUserId,
    );
  }
}
