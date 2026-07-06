import { AIHandler, envKeySource } from '@jxburros/ai-handler';
import { loadConnections } from '@/lib/ai-config';

export const runtime = 'nodejs';

interface ConnectionModels {
  id: string;
  label: string;
  provider: string;
  models: string[];
  error?: string;
}

export async function GET() {
  const connections = loadConnections();
  const handler = new AIHandler({ keySource: envKeySource() });

  const results: ConnectionModels[] = await Promise.all(
    connections.map(async (connection): Promise<ConnectionModels> => {
      const fallback = connection.defaultModel ? [connection.defaultModel] : [];
      try {
        const models = await handler.listModels({
          id: connection.id,
          provider: connection.provider,
          baseUrl: connection.baseUrl,
          keyRef: connection.keyRef,
        });
        const ids = models.map((model) => model.id);
        // Some adapters (anthropic, google) don't implement discovery and
        // always return [] — fall back to the configured default model so
        // the connection still has something selectable.
        const available = ids.length > 0 ? ids : fallback;
        return {
          id: connection.id,
          label: connection.label,
          provider: connection.provider,
          models: available,
          error: available.length === 0 ? 'No models available for this connection' : undefined,
        };
      } catch (error) {
        return {
          id: connection.id,
          label: connection.label,
          provider: connection.provider,
          models: fallback,
          error: error instanceof Error ? error.message : 'Failed to list models',
        };
      }
    }),
  );

  return Response.json({ connections: results });
}
