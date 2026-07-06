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

export interface ConnectionConfig {
  id: string;
  label: string;
  provider: string;
  baseUrl?: string;
  keyRef: KeyRef;
  /**
   * Used when the provider's adapter doesn't implement listModels() (e.g.
   * anthropic, google both return [] — see NUGGET_TEST_NOTES.md) so the UI
   * still has at least one selectable model for that connection.
   */
  defaultModel?: string;
}

interface RawConnection {
  id?: string;
  label?: string;
  provider: string;
  baseUrl?: string;
  keyEnv?: string;
  defaultModel?: string;
}

/**
 * The set of connections a user is allowed to pick from is declared here,
 * server-side, from env config — never from client request input. A client
 * only ever selects a connectionId + model out of this list (see
 * app/api/chat/route.ts); it can't hand the server an arbitrary provider or
 * baseUrl to call out to.
 */
export function loadConnections(): ConnectionConfig[] {
  const raw = process.env.AI_CONNECTIONS;
  if (raw) {
    let parsed: RawConnection[];
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`AI_CONNECTIONS is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    return parsed.map(toConnectionConfig);
  }

  // Backward-compatible single-connection fallback for the original
  // AI_PROVIDER/AI_MODEL/AI_BASE_URL/AI_API_KEY_ENV env vars.
  return [
    toConnectionConfig({
      id: 'default',
      label: 'Default',
      provider: process.env.AI_PROVIDER ?? 'openai',
      baseUrl: process.env.AI_BASE_URL,
      keyEnv: process.env.AI_API_KEY_ENV,
      defaultModel: process.env.AI_MODEL ?? 'gpt-4o-mini',
    }),
  ];
}

export function findConnection(connections: ConnectionConfig[], id: string): ConnectionConfig | undefined {
  return connections.find((connection) => connection.id === id);
}

function toConnectionConfig(entry: RawConnection): ConnectionConfig {
  const provider = entry.provider;
  const keyEnvName = entry.keyEnv ?? DEFAULT_KEY_ENV[provider];
  const keyRef: KeyRef = keyEnvName ? { kind: 'env', name: keyEnvName } : { kind: 'none' };
  return {
    id: entry.id ?? provider,
    label: entry.label ?? provider,
    provider,
    baseUrl: entry.baseUrl,
    keyRef,
    defaultModel: entry.defaultModel,
  };
}
