import { NotificationType } from './notification-type';

export class Notification {
  constructor(
    public readonly id: string,
    public readonly recipientUserId: string,
    public readonly actorUserId: string | null,
    public readonly ticketId: string | null,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly message: string,
    public readonly link: string | null,
    public readonly readAt: string | null,
    public readonly createdAt: string,
  ) {}
}
