import type { ChatContentPart, ChatParams } from '../types';

const MESSAGE_OVERHEAD_BYTES = 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const partBytes = (part: ChatContentPart): number => (part.type === 'text' ? part.text.length : part.data.length);

const isInvalidFile = (part: ChatContentPart): boolean =>
  part.type === 'file' && (!part.mimeType || !part.data || !BASE64.test(part.data));

export const estimateChatBytes = (params: ChatParams): number =>
  params.messages.reduce((total, message) => {
    const content = typeof message.content === 'string'
      ? message.content.length
      : message.content.reduce((sum, part) => sum + partBytes(part), 0);
    return total + content + MESSAGE_OVERHEAD_BYTES;
  }, 0);

export const validateChatParams = (params: ChatParams): string | null => {
  if (!params.messages || params.messages.length === 0) return 'At least one message is required';
  for (const [i, message] of params.messages.entries()) {
    if (typeof message.content === 'string') continue;
    const j = message.content.findIndex(isInvalidFile);
    if (j >= 0) return `messages[${i}].content[${j}] has invalid file data`;
  }
  return null;
};
