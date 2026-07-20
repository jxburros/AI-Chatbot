export interface ValidatedChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  connectionId: string;
  model: string;
}

type ValidationResult =
  | { ok: true; value: ValidatedChatRequest }
  | { ok: false; error: string };

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_MESSAGE_CHARS = 32_000;
const MAX_SELECTOR_CHARS = 128;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function validateChatRequest(value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, error: 'Request body must be an object' };
  if (!Array.isArray(value.messages) || value.messages.length === 0) {
    return { ok: false, error: 'messages array is required' };
  }
  if (value.messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages cannot exceed ${MAX_MESSAGES} items` };
  }

  let totalChars = 0;
  const messages: ValidatedChatRequest['messages'] = [];
  for (const item of value.messages) {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') {
      return { ok: false, error: 'Each message must have a valid role and string content' };
    }
    const content = item.content.trim();
    if (!content) return { ok: false, error: 'Messages cannot be blank' };
    if (content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: `Each message cannot exceed ${MAX_MESSAGE_CHARS} characters` };
    }
    totalChars += content.length;
    if (totalChars > MAX_TOTAL_MESSAGE_CHARS) {
      return { ok: false, error: `Message content cannot exceed ${MAX_TOTAL_MESSAGE_CHARS} characters` };
    }
    messages.push({ role: item.role, content });
  }

  const connectionId = typeof value.connectionId === 'string' ? value.connectionId.trim() : '';
  const model = typeof value.model === 'string' ? value.model.trim() : '';
  if (!connectionId || connectionId.length > MAX_SELECTOR_CHARS) {
    return { ok: false, error: 'A valid connectionId is required' };
  }
  if (!model || model.length > MAX_SELECTOR_CHARS) {
    return { ok: false, error: 'A valid model is required' };
  }

  return { ok: true, value: { messages, connectionId, model } };
}
