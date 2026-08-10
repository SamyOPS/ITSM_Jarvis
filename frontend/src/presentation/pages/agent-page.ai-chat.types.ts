export type AiChatMessage = {
  attachments?: AiChatAttachmentSummary[];
  body: string;
  id: string;
  role: 'assistant' | 'user';
};

export type AiChatAttachmentSummary = {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export const INITIAL_AI_CHAT_MESSAGES: AiChatMessage[] = [
  {
    body: 'Bonjour, quel est votre probleme ?',
    id: 'assistant-welcome',
    role: 'assistant',
  },
];
