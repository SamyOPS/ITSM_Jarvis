import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';

export abstract class AdminUserReadRepository {
  abstract listUsers(): Promise<AdminUserSummary[]>;
}
