# Prompt Mirror

A one-thought-at-a-time reflective companion. It deliberately produces four small cards instead of a conventional chat transcript.

## Run

```bash
cd prompt-mirror
npm install
OPENAI_API_KEY=... npm run dev
```

Defaults: `AI_PROVIDER=openai`, `AI_MODEL=gpt-4o-mini`, and `AI_KEY_ENV=OPENAI_API_KEY`. The browser only talks to this local server; the API key stays in the server process. Any provider supported by `@jxburros/ai-nugget` can be selected with environment variables.
