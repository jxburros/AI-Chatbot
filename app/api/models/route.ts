import { AIHandler, envKeySource } from '@jxburros/ai-handler';
import { loadConnections } from '@/lib/ai-config';
import { resolveConnectionModels } from '@/lib/models';

export const runtime = 'nodejs';

interface ConnectionModels {
  id: string;
  label: string;
  provider: string;
  models: string[];
  modelSource: 'discovered' | 'fallback' | 'unavailable';
  warning?: string;
  error?: string;
}

export async function GET() {
  const connections = loadConnections();
  const handler = new AIHandler({ keySource: envKeySource() });

  const results: ConnectionModels[] = await Promise.all(
    connections.map(async (connection): Promise<ConnectionModels> => {
      const resolution = await resolveConnectionModels(handler, connection);
      return {
        id: connection.id,
        label: connection.label,
        provider: connection.provider,
        models: resolution.models,
        modelSource: resolution.source,
        warning: resolution.warning,
        error: resolution.error,
      };
    }),
  );

  return Response.json({ connections: results });
}
