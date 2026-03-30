export enum RequestApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const DEFAULT_REQUEST_APPROVAL_STATUSES = [
  RequestApprovalStatus.PENDING,
  RequestApprovalStatus.APPROVED,
  RequestApprovalStatus.REJECTED,
] as const;
