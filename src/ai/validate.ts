import type { ChatContentPart, ChatParams } from '../types';

const MESSAGE_OVERHEAD_BYTES = 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

type Loose = Record<string, unknown>;

const isObject = (value: unknown): value is Loose => typeof value === 'object' && value !== null;

const isValidFile = (part: Loose): boolean =>
  typeof part.mimeType === 'string' && part.mimeType.length > 0 &&
  typeof part.data === 'string' && part.data.length > 0 && BASE64.test(part.data);

const partProblem = (part: unknown, at: string): string | null => {
  if (!isObject(part)) return `${at} is not a valid content part`;
  if (part.type === 'text') return typeof part.text === 'string' ? null : `${at} has invalid text`;
  if (part.type === 'file') return isValidFile(part) ? null : `${at} has invalid file data`;
  return `${at} is not a valid content part`;
};

const messageProblem = (message: unknown, i: number): string | null => {
  const content: unknown = isObject(message) ? message.content : undefined;
  if (typeof content === 'string') return null;
  if (!Array.isArray(content)) return `messages[${i}].content must be a string or an array of parts`;
  for (const [j, part] of content.entries()) {
    const problem = partProblem(part, `messages[${i}].content[${j}]`);
    if (problem) return problem;
  }
  return null;
};

const partBytes = (part: ChatContentPart): number => (part.type === 'text' ? part.text.length : part.data.length);

export const estimateChatBytes = (params: ChatParams): number =>
  params.messages.reduce((total, message) => {
    const content = typeof message.content === 'string'
      ? message.content.length
      : message.content.reduce((sum, part) => sum + partBytes(part), 0);
    return total + content + MESSAGE_OVERHEAD_BYTES;
  }, 0);

export const validateChatParams = (params: ChatParams): string | null => {
  if (!isObject(params) || !Array.isArray(params.messages) || params.messages.length === 0) {
    return 'At least one message is required';
  }
  for (const [i, message] of params.messages.entries()) {
    const problem = messageProblem(message, i);
    if (problem) return problem;
  }
  return null;
};
