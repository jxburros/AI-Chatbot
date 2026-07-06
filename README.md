# Sprout's Garden Chat

A small garden-themed AI chatbot built with Next.js (App Router) and
[`@jxburros/ai-handler`](https://github.com/jxburros/AI-Nugget) ("AI Nugget") —
a zero-dependency, isomorphic TypeScript library that handles provider calls,
retries, and streaming for OpenAI, Anthropic, Google, Ollama, and
OpenAI-compatible endpoints.

This app exists to test how effectively the AI Nugget can be used as the
provider layer for a real app. Since it can't take a package dependency
without a registry token here, the library's compiled `dist/` output is
vendored at `vendor/ai-handler/` (see `NUGGET_TEST_NOTES.md` for why `dist/`
rather than the `nugget/` source build).

## How it's wired

- `vendor/ai-handler/` — the vendored AI Nugget, compiled JS + `.d.ts`
  (copied from the library's own `dist/`).
- `lib/ai-config.ts` — maps env vars to a `Connection` + `KeyRef` for the
  nugget's `AIHandler`. This mapping is app-owned by design: the nugget
  intentionally ships no default provider policy.
- `app/api/chat/route.ts` — a Route Handler that calls `handler.stream(...)`
  and re-emits `delta`/`done`/`error` events as Server-Sent Events.
- `components/ChatApp.tsx` — the chat UI (client component) that reads the
  SSE stream and renders it with a garden/spring theme.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — `npm run dev` picks the
next free port automatically (3001, 3002, ...) if 3000 is already in use, and
prints which one it landed on.

### Configuring a provider

Sprout defaults to OpenAI's `gpt-4o-mini`. Set env vars (e.g. in `.env.local`)
to change providers:

```bash
# .env.local
AI_PROVIDER=openai        # openai | anthropic | google | ollama | groq | ...
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...      # key env var name depends on AI_PROVIDER, see lib/ai-config.ts

# Optional overrides
AI_BASE_URL=               # for local runtimes (ollama/lmstudio/llamacpp/vllm) or self-hosted proxies
AI_API_KEY_ENV=             # override which env var holds the key
```

For a local model with no key, e.g. Ollama:

```bash
AI_PROVIDER=ollama
AI_MODEL=llama3.2
```

## Commands

```bash
npm run dev      # start the dev server (auto-picks a free port)
npm run build    # production build (also the typecheck, via next build)
npm run lint     # eslint
```

## Known issues / notes from building this

See `NUGGET_TEST_NOTES.md` for issues encountered while integrating the AI
Nugget into a real app, and how they were worked around.
