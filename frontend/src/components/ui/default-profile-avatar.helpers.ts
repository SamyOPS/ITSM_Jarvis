const DEFAULT_PROFILE_AVATAR_COLOR_COUNT = 11;
const DEFAULT_PROFILE_AVATAR_STORAGE_PREFIX = 'vision-default-avatar-seed:';

function getAvatarColorIndex(seed: string): number {
  const normalizedSeed = seed.trim() || 'vision-user';
  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = (hash * 31 + normalizedSeed.charCodeAt(index)) % 2147483647;
  }

  return (hash % DEFAULT_PROFILE_AVATAR_COLOR_COUNT) + 1;
}

function getStorageKey(seed: string): string {
  return `${DEFAULT_PROFILE_AVATAR_STORAGE_PREFIX}${seed.trim() || 'vision-user'}`;
}

function getStoredAvatarSeed(seed: string): string {
  if (typeof window === 'undefined') {
    return seed;
  }

  try {
    return window.localStorage.getItem(getStorageKey(seed)) ?? seed;
  } catch {
    return seed;
  }
}

export function getDefaultProfileAvatarColorIndex(seed: string): number {
  return getAvatarColorIndex(getStoredAvatarSeed(seed));
}

export function rotateDefaultProfileAvatarSeed(seed: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const currentSeed = getStoredAvatarSeed(seed);
  const currentColorIndex = getAvatarColorIndex(currentSeed);
  let nextSeed = currentSeed;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidateSeed = `${seed || 'vision-user'}-${Date.now()}-${Math.random()}-${attempt}`;

    if (getAvatarColorIndex(candidateSeed) !== currentColorIndex) {
      nextSeed = candidateSeed;
      break;
    }

    nextSeed = candidateSeed;
  }

  try {
    window.localStorage.setItem(getStorageKey(seed), nextSeed);
  } catch {
    // A storage failure should not block profile photo deletion.
  }
}
