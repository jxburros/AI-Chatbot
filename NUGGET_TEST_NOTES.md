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

## Gap: no built-in way to "attach a model" — apps have to build the whole seam

The first version of this app hardcoded provider/model/key via server env
vars, with no way for the end user to pick a model. Adding that (server-side
allowlist of `Connection`s in `lib/ai-config.ts`, a `GET /api/models` route
that calls `handler.listModels()` per connection, a picker UI, and
`connectionId`/`model` threaded through `/api/chat`) was straightforward with
the primitives the nugget already exposes, but it's entirely app-built — the
nugget has no opinion on it, which is consistent with it not being a router
(see README "Non-goals"), but the *pattern* is general enough that every
consuming app will probably reinvent it. Two things worth documenting in the
nugget itself as a recommended pattern (raised back as a suggestion, not
something we changed in AI-Nugget from this repo):

1. **`provider`/`baseUrl` must come from a server-side allowlist, never
   client input — but `model` is fine as free-form client input.** Letting a
   client pick an arbitrary `provider`/`baseUrl` would let it point the
   server's own `KeySource` resolution at an attacker-controlled endpoint
   (SSRF, plus the server's real key gets sent to wherever `baseUrl` points).
   `model` carries no such risk: a bad value just comes back as an ordinary
   provider error. This asymmetry isn't obvious from the `Connection`/
   `ChatRequest` type split alone (both `provider`/`baseUrl` on `Connection`
   and `model` on `ChatRequest` are just strings) — worth a one-line callout
   in the README's `KeySource`/`Connection` docs.
2. **`listModels()` is optional per adapter, and two of the four engines
   (`anthropic`, `google`) always return `[]`** (confirmed by grepping the
   vendored adapters — no `listModels` method on either engine file). The
   `ProviderCapabilities`/provider table documents `nativeTools`/`jsonMode`/
   `local`/`embeddable` per provider, but not "supports model discovery" —
   an app building a model picker on `listModels()` needs to know this
   up front to design a fallback (here: a per-connection `defaultModel`),
   not discover it by getting an empty dropdown for Claude/Gemini. Worth
   adding a `modelDiscovery: boolean` (or similar) to the capabilities table,
   or at minimum a callout next to `listModels()` in the README.

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
  `AI_BASE_URL`/`AI_API_KEY_ENV`, or `AI_CONNECTIONS` for several at once)
  with zero code changes, exactly as advertised by the profile-table design.
- `handler.listModels()` worked as the live model-discovery seam for the
  engines that implement it — verified against a local fake OpenAI-compatible
  server exposing `/v1/models`, and against one that 404s on it (simulating
  `anthropic`/`google`) to confirm the empty-result + fallback path.

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
