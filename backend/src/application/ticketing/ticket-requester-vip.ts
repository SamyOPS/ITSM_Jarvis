import { UserAssignmentProfileRepository } from '../auth/repositories/user-assignment-profile.repository';

export async function isTicketRequesterVip(
  userAssignmentProfileRepository: UserAssignmentProfileRepository | undefined,
  createdByUserId: string,
  requestedForUserId?: string | null,
): Promise<boolean> {
  const requesterId = (requestedForUserId ?? createdByUserId).trim();

  if (!requesterId || !userAssignmentProfileRepository) {
    return false;
  }

  const profile = await userAssignmentProfileRepository.getById(requesterId);

  return Boolean(profile?.isVip);
}
