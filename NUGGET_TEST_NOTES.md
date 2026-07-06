# AI Nugget integration test notes

This app was built specifically to test whether `@jxburros/ai-handler` ("the
AI Nugget") can be dropped into a real app and used effectively. Overall: yes
— once past one packaging/bundler wrinkle below, `AIHandler.stream()` +
`envKeySource()` was enough to get a working, provider-agnostic streaming
chat endpoint with almost no glue code.

## Issue: no easy path to consume the nugget without a registry token

The nugget's own README documents two distribution paths: GitHub Packages
(needs an authenticated token, even for a public repo) or vendoring the
`nugget/` folder. Neither is a drop-in `npm install` for a fresh app in an
environment without a `GITHUB_TOKEN` configured, so the "vendor it" path is
effectively the only option for a quick app test. Not a bug, just worth
naming as friction for the "install / use" quick-start.

## Issue: the vendored `nugget/` folder (TS source) doesn't bundle out of the box

`nugget/src/*.ts` uses NodeNext-style relative imports with explicit `.js`
extensions (e.g. `export * from './types.js'`), which is correct/required
for `tsc`'s `moduleResolution: bundler`/`nodenext` to resolve `.ts` files
during type-checking. But it tripped up Next.js 16's Turbopack bundler at
**runtime**: aliasing `@jxburros/ai-handler` straight at
`nugget/src/index.ts` type-checked fine, but failed to actually resolve at
build/dev time ("Module not found: Can't resolve './types.js'"), and a
follow-up attempt (aliasing at the compiled `dist/index.d.ts`) type-checked
and *built* but produced a runtime module where some named exports silently
resolved to `undefined` (`envKeySource` was `undefined` while `AIHandler`
was fine) — Turbopack appears to special-case `.d.ts` resolution in a way
that doesn't reliably become the paired `.js` at runtime.

**Workaround used here:** vendor the package's own compiled `dist/` output
(real `.js` + `.d.ts` pairs) instead of the `nugget/` TypeScript source, and
point the `tsconfig.json` path alias at the `.js` entry points
(`vendor/ai-handler/index.js`, `vendor/ai-handler/agent/index.js`) rather
than the source or the declaration file. TypeScript then finds the sibling
`.d.ts` for types automatically, and the bundler resolves a real, complete
JS module. See `tsconfig.json` and `vendor/ai-handler/`.

This is worth a note back to the AI-Nugget maintainers: `build:nugget`'s
vendored output (TS source with `.js`-suffixed relative imports) assumes a
consuming toolchain that treats `.ts` and `.js` as interchangeable at
resolution time. That's true for `tsc` but wasn't true for Turbopack's
runtime module graph in this test. Consuming apps on Turbopack (or asking
"can I just vendor and go") should vendor `dist/` instead, or the nugget
could document that caveat next to the two distribution paths.

## What worked cleanly

- `AIHandler.stream(connection, request)` mapped directly onto a Next.js
  Route Handler returning a `ReadableStream` of SSE events — no adapter code
  needed beyond re-shaping `StreamEvent` into `data: ...\n\n` frames.
- `envKeySource()` + a `KeyRef` built from an app-owned provider→env-var map
  (`lib/ai-config.ts`) was exactly the seam the nugget's docs describe:
  missing keys came back as an honest `key_unavailable` `AIError`, not a
  silent failure or a fake success — verified by hitting `/api/chat` with no
  key configured and confirming a typed error event, and separately against
  a local fake OpenAI-compatible SSE server (`openai-compat` profile) to
  confirm the full delta/done event stream works end-to-end.
- Provider switching is a pure config change (`AI_PROVIDER`/`AI_MODEL`/
  `AI_BASE_URL`/`AI_API_KEY_ENV`) with zero code changes, exactly as
  advertised by the profile-table design.

## Validation performed

- `npx tsc --noEmit` — passes.
- `npm run build` (Next.js/Turbopack production build) — passes.
- Manual dev-server test: missing-key path returns a graceful typed SSE
  error; a local fake OpenAI-compatible streaming server confirmed real
  delta → done event flow renders correctly in the UI (screenshots taken
  during the build session).
- No real hosted-provider credentials were available in this environment,
  so `openai`/`anthropic`/etc. were not smoke-tested against the real APIs —
  only the `openai-compat` engine against a local fake server, and the
  nugget's own key-resolution failure path.
