import { RequestType } from '../../../domain/ticketing/request-type';

export type CreateRequestDto = {
  categoryId: string;
  channelId?: string | null;
  ciId?: string | null;
  description: string;
  priorityId: string;
  requestedForUserId?: string | null;
  requestType?: RequestType | null;
  title: string;
};
