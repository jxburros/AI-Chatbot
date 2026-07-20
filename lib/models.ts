import type { AIHandler } from '@jxburros/ai-handler';
import type { ConnectionConfig } from '@/lib/ai-config';

export interface ModelResolution {
  models: string[];
  source: 'discovered' | 'fallback' | 'unavailable';
  warning?: string;
  error?: string;
}

const handlerConnection = (connection: ConnectionConfig) => ({
  id: connection.id,
  provider: connection.provider,
  baseUrl: connection.baseUrl,
  keyRef: connection.keyRef,
});

export async function resolveConnectionModels(
  handler: AIHandler,
  connection: ConnectionConfig,
): Promise<ModelResolution> {
  try {
    const discovered = await handler.listModels(handlerConnection(connection));
    const models = [...new Set(discovered.map((model) => model.id).filter(Boolean))];
    if (models.length > 0) return { models, source: 'discovered' };
    if (connection.defaultModel) {
      return {
        models: [connection.defaultModel],
        source: 'fallback',
        warning: 'Model discovery returned no models; using the configured default.',
      };
    }
    return {
      models: [],
      source: 'unavailable',
      error: 'No models are available for this connection.',
    };
  } catch (error) {
    console.error('Model discovery failed', {
      connectionId: connection.id,
      error: error instanceof Error ? error.message : String(error),
    });
    if (connection.defaultModel) {
      return {
        models: [connection.defaultModel],
        source: 'fallback',
        warning: 'Model discovery is unavailable; using the configured default.',
      };
    }
    return {
      models: [],
      source: 'unavailable',
      error: 'Could not load models for this connection.',
    };
  }
}
