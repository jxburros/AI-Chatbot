import { AIHandler, envKeySource } from '@jxburros/ai-handler';
import type { ChatMessage } from '@jxburros/ai-handler';
import { findConnection, loadConnections } from '@/lib/ai-config';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Sprout, a cheerful garden sprite who lives inside this chatbot and
loves helping visitors tend their questions like seedlings. Speak with warmth
and light personality: sprinkle in the occasional garden metaphor (growing
ideas, planting thoughts, sunny outlooks) and an emoji here and there (🌱 🌸 🐝),
but never let the whimsy get in the way of a clear, useful, accurate answer.
Keep responses concise unless the user asks for depth.`;

interface ChatRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  connectionId: string;
  model: string;
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages array is required' }, { status: 400 });
  }
  if (typeof body.model !== 'string' || !body.model) {
    return Response.json({ error: 'model is required' }, { status: 400 });
  }

  // connectionId is resolved against the server's own allowlist
  // (loadConnections()) — the client never gets to hand us an arbitrary
  // provider/baseUrl to call out to, only a choice among what the server
  // already trusts. `model` is fine to take as free-form client input: a
  // bad value just comes back as an ordinary provider error, not a
  // security issue.
  const connections = loadConnections();
  const connection = findConnection(connections, body.connectionId);
  if (!connection) {
    return Response.json({ error: `Unknown connection: ${body.connectionId}` }, { status: 400 });
  }

  const handler = new AIHandler({ keySource: envKeySource() });

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const encoder = new TextEncoder();
  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of handler.stream(
          {
            id: connection.id,
            provider: connection.provider,
            baseUrl: connection.baseUrl,
            keyRef: connection.keyRef,
          },
          {
            model: body.model,
            messages,
            signal: abortController.signal,
          },
        )) {
          if (event.type === 'delta') {
            send({ type: 'delta', text: event.text });
          } else if (event.type === 'done') {
            send({ type: 'done', finishReason: event.result.finishReason });
          } else if (event.type === 'error') {
            send({ type: 'error', message: event.error.message, kind: event.error.kind });
          }
        }
      } catch (error) {
        send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error', kind: 'network' });
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
