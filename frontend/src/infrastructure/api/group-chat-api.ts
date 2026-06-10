import { getFrontendRuntimeConfig } from '../config/env';

export type GroupChatMessageSnapshot = {
  authorUserId: string;
  body: string;
  createdAt: string;
  groupId: string;
  id: string;
};

export async function fetchGroupChatMessages(
  accessToken: string,
  groupId: string,
): Promise<GroupChatMessageSnapshot[]> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/chat/messages`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Le chargement du chat de groupe a échoué avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as GroupChatMessageSnapshot[];
}

export async function createGroupChatMessage(
  accessToken: string,
  groupId: string,
  body: string,
): Promise<GroupChatMessageSnapshot> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const response = await fetch(
    `${apiUrl}/groups/${encodeURIComponent(groupId)}/chat/messages`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `L'envoi du message de groupe a échoué avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as GroupChatMessageSnapshot;
}
