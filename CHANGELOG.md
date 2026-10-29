# Changelog

## 2026-10-27 — Codex

### Changed
- Adopt AI-Nugget 0.7.5 from source commit `f8e563fd6c23957b0885e131c5aac4e9a7851693` for the provider/cloud expansion; preserve application-owned policy and model selection.

### Not completed
- Live provider calls were not exercised (no configured provider test credentials).

### Notes
- Passed npm run lint and the Next.js production build. Excluded generated upstream vendor artifacts from application linting and annotated historical integration notes.

## Unreleased

### Fixed

- Validated and bounded chat payloads before forwarding them to providers.
- Restricted requested models to the selected connection's resolved model set.
- Sanitized model-discovery errors returned to the browser.
- Prevented rapid sends from starting overlapping streams.
- Forced Next.js to use a patched PostCSS release.

### Changed

- Model-list responses now distinguish discovered, configured fallback, and
  unavailable model states.
- Expanded multi-connection setup guidance without embedding key-like example
  values.
