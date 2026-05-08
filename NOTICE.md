# Third-party notices

AIVC DACH bundles or builds upon the following open-source projects.

## OpenCut

- **Source:** https://github.com/OpenCut-app/OpenCut
- **License:** MIT (see [`editor/LICENSE`](./editor/LICENSE))
- **Copyright:** Copyright 2025-2026 OpenCut

The contents of `editor/` are a fork of OpenCut. We have:

- removed `apps/desktop/` (native app), `rust/` (GPU compositor) and `Cargo.*` (Rust toolchain) — we only ship the web app.
- replaced primary/accent CSS variables with the AIVC DACH brand palette in `editor/apps/web/src/app/globals.css`.
- changed site metadata in `editor/apps/web/src/site/brand.ts` and `editor/apps/web/src/app/metadata.ts`.
- set the default theme to `"dark"` in `editor/apps/web/src/app/layout.tsx`.

The full OpenCut source remains available upstream under MIT.

## Vercel AI SDK

- **Source:** https://github.com/vercel/ai
- **License:** Apache-2.0
- Used via `mcp-server/` (planned for v3.0.0 full release) for Anthropic / OpenAI / Ollama provider abstraction.

## Model Context Protocol SDK

- **Source:** https://github.com/modelcontextprotocol/typescript-sdk
- **License:** MIT
- Used by `mcp-server/` for the stdio transport.

## Puppeteer & ffmpeg

- **Puppeteer** — Apache-2.0 — used by `generator/renderer/`.
- **ffmpeg-static** — bundles ffmpeg binaries (LGPL/GPL depending on build).

## Inter font (web)

- **License:** SIL Open Font License 1.1
- Loaded at runtime via Google Fonts in templates and editor.
