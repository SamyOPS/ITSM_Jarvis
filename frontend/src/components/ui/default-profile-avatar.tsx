import { UserRound } from 'lucide-react';

import { getDefaultProfileAvatarColorIndex } from './default-profile-avatar.helpers';

interface DefaultProfileAvatarProps {
  className?: string;
  seed: string;
}

interface ProfileAvatarProps extends DefaultProfileAvatarProps {
  profilePhotoUrl?: string | null;
}

export function DefaultProfileAvatar({
  className,
  seed,
}: DefaultProfileAvatarProps) {
  const colorIndex = getDefaultProfileAvatarColorIndex(seed);
  const classNames = [
    'default-profile-avatar',
    `default-profile-avatar--color-${colorIndex}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames}>
      <UserRound
        aria-hidden="true"
        className="default-profile-avatar-icon"
        strokeWidth={3.1}
      />
    </span>
  );
}

export function ProfileAvatar({
  className,
  profilePhotoUrl,
  seed,
}: ProfileAvatarProps) {
  if (profilePhotoUrl) {
    return (
      <span className={className}>
        <img alt="" src={profilePhotoUrl} />
      </span>
    );
  }

  return <DefaultProfileAvatar className={className} seed={seed} />;
}
