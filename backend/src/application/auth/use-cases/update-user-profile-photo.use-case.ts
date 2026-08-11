import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import {
  AdminUserWriteRepository,
  type UpdateUserProfilePhotoRecord,
} from '../repositories/admin-user-write.repository';

const PROFILE_PHOTO_BUCKET_ID = 'profile-photos';
const SUPPORTED_PROFILE_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
]);
const PROFILE_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export type UpdateUserProfilePhotoCommand = UpdateUserProfilePhotoRecord & {
  userId: string;
};

@Injectable()
export class UpdateUserProfilePhotoUseCase {
  constructor(
    @Inject(AdminUserWriteRepository)
    private readonly adminUserWriteRepository: AdminUserWriteRepository,
  ) {}

  update(command: UpdateUserProfilePhotoCommand): Promise<AdminUserSummary> {
    const userId = command.userId.trim();
    const bucketId = command.bucketId.trim();
    const mimeType = command.mimeType.trim().toLowerCase();
    const publicUrl = command.publicUrl.trim();
    const storagePath = command.storagePath.trim();
    const sizeBytes = Number(command.sizeBytes);

    if (!userId) {
      throw new BadRequestException('userId is required.');
    }

    if (bucketId !== PROFILE_PHOTO_BUCKET_ID) {
      throw new BadRequestException('bucketId is invalid.');
    }

    if (!storagePath || !storagePath.startsWith(`${userId}/`)) {
      throw new BadRequestException('storagePath is invalid.');
    }

    if (!publicUrl) {
      throw new BadRequestException('publicUrl is required.');
    }

    if (!SUPPORTED_PROFILE_PHOTO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('profile photo mime type is invalid.');
    }

    if (
      !Number.isFinite(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > PROFILE_PHOTO_MAX_SIZE_BYTES
    ) {
      throw new BadRequestException('profile photo size is invalid.');
    }

    return this.adminUserWriteRepository.updateUserProfilePhoto(userId, {
      bucketId,
      mimeType,
      publicUrl,
      sizeBytes,
      storagePath,
    });
  }

  delete(userId: string): Promise<AdminUserSummary> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('userId is required.');
    }

    return this.adminUserWriteRepository.deleteUserProfilePhoto(
      normalizedUserId,
    );
  }
}
