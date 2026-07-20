# Changelog

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
