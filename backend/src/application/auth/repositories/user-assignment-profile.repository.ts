import { UserAssignmentProfile } from '../../../domain/auth/user-assignment-profile';

export abstract class UserAssignmentProfileRepository {
  abstract getById(userId: string): Promise<UserAssignmentProfile | null>;
}
