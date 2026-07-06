import type { KeyRef } from '@jxburros/ai-handler';

/**
 * Default API-key env var per provider, since ai-handler's KeySource seam
 * requires the app (not the library) to decide this mapping.
 */
const DEFAULT_KEY_ENV: Record<string, string | undefined> = {
  openai: 'OPENAI_API_KEY',
  'azure-openai': 'AZURE_OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  together: 'TOGETHER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  ollama: undefined,
  lmstudio: undefined,
  llamacpp: undefined,
  vllm: undefined,
};

export interface AiConfig {
  provider: string;
  model: string;
  baseUrl?: string;
  keyRef: KeyRef;
}

export function loadAiConfig(): AiConfig {
  const provider = process.env.AI_PROVIDER ?? 'openai';
  const model = process.env.AI_MODEL ?? 'gpt-4o-mini';
  const baseUrl = process.env.AI_BASE_URL;
  const keyEnvName = process.env.AI_API_KEY_ENV ?? DEFAULT_KEY_ENV[provider];
  const keyRef: KeyRef = keyEnvName ? { kind: 'env', name: keyEnvName } : { kind: 'none' };
  return { provider, model, baseUrl, keyRef };
}
