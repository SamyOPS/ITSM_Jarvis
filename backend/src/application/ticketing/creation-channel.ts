import { BadRequestException } from '@nestjs/common';
import { ReferentialChannelReadRepository } from '../referentials/repositories/referential-channel-read.repository';
import { UserRole } from '../../domain/auth/user-role';

type ResolveCreationChannelIdParams = {
  channelId: string | null | undefined;
  channelRepository: ReferentialChannelReadRepository;
  creatorRole: UserRole;
};

export async function resolveCreationChannelId({
  channelId,
  channelRepository,
  creatorRole,
}: ResolveCreationChannelIdParams): Promise<string | null> {
  if (creatorRole !== UserRole.DEMANDEUR) {
    return normalizeOptionalId(channelId);
  }

  const channels = await channelRepository.listChannels();
  const portalChannel = channels.find((channel) =>
    isPortalChannelName(channel.name),
  );

  if (!portalChannel) {
    throw new BadRequestException(
      "Le canal 'Portail' est manquant dans Supabase.",
    );
  }

  return portalChannel.id;
}

function isPortalChannelName(name: string): boolean {
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return normalizedName === 'portail' || normalizedName === 'portal';
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
