import { RequestApprovalStatus } from './request-approval-status';
import { RequestType } from './request-type';

export class RequestTicket {
  constructor(
    public readonly ticketId: string,
    public readonly requestType: RequestType,
    public readonly approvalStatus: RequestApprovalStatus | null,
    public readonly fulfilledAt: string | null,
  ) {}
}
