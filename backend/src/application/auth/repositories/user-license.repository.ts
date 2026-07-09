import { UserLicenseSettings } from '../../../domain/auth/user-license';

export abstract class UserLicenseRepository {
  abstract getSettings(): Promise<UserLicenseSettings>;
  abstract updateSettings(
    settings: UserLicenseSettings,
  ): Promise<UserLicenseSettings>;
}
