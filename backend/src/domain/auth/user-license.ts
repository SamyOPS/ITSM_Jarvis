export type UserLicenseSettings = {
  maxBillableUsers: number | null;
};

export type UserLicenseSnapshot = UserLicenseSettings & {
  billableActiveUsers: number;
  remainingBillableUsers: number | null;
};
