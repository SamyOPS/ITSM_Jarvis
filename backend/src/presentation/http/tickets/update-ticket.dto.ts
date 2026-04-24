export type UpdateTicketDto = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  requestedForUserId?: string | null;
  serviceId?: string | null;
  title: string;
};
