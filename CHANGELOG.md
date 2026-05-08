# Changelog

All notable changes to AIVC DACH.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## v3.0.0-alpha.2 – 2026-05-08 · AI layer (chat sidebar + real editor tools)

This release wires the AI layer end-to-end inside the editor. Users can now drive the timeline from a chat panel.

### Added
- **`editor/apps/web/src/ai/`** — Vercel AI SDK integration:
  - `tools.ts` — Zod schemas for `editor.getState`, `editor.cut`, `editor.trim`, `editor.addClip`, shared between server and client.
  - `tool-executor.ts` — client-side execution against `EditorCore.getInstance()`. Tools mutate the timeline through OpenCut's existing command pattern (`editor.timeline.splitElements`, `updateElements`, `insertElement`), so undo/redo Just Works.
  - `selection-resolver.ts` — for `editor.cut`, finds all clips active at the given timestamp across video, audio, overlay tracks. **Default behavior**: skip muted audio tracks and hidden visual tracks; cut everything else. (See "Known scope cuts" below.)
  - `time-utils.ts` — seconds ↔ `MediaTime` (WASM tick) conversion at the boundary.
  - `provider.ts` — Anthropic (default), Google (Gemini), OpenAI, Ollama selectable via `AIVC_AI_PROVIDER`. **No hardcoded model names** — the model id is read from a per-provider env var (`ANTHROPIC_MODEL`, `GEMINI_MODEL`, `OPENAI_MODEL`, `OLLAMA_MODEL`). Missing key or missing model → German error message with a link to the provider's API-key console or model-list docs (so the message stays accurate as provider lineups shift).
  - `components/chat-sidebar.tsx` + `components/tool-call-display.tsx` — collapsible right-side chat panel with streaming, tool-call visualization (input/output JSON, status badge), keyboard submit (Enter), error surfacing.
- **`/api/ai/chat`** — Next.js route handler using `streamText` with the four tool definitions. Returns 400 + structured error if the selected provider is misconfigured.
- **`.env.example`** — documents `AIVC_AI_PROVIDER` plus per-provider `*_API_KEY` and `*_MODEL` pairs. Each provider block links to the official model list so users can pick a current id without guessing.
- **Editor page**: floating Bot toggle (top-right of preview area) opens the sidebar; close button collapses it.

### Changed
- **`mcp-server/README.md`** — clearly marks the stdio server as held back for alpha.3. Real `editor.*` tools live in the editor itself for alpha.2; the WebSocket bridge from the stdio server to the running browser tab lands in alpha.3 (so external agents like Claude Code can drive the timeline too).

### Dependencies
- Added to `editor/apps/web`: `ai@^6`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/react`, `ollama-ai-provider-v2`.

### Known scope cuts (deferred)
- **Bidirectional state sync** (UI → chat awareness): chat does not yet observe UI-driven edits. Planned for alpha.3.
- **MCP-server bridge**: stdio server still returns "not implemented yet" for `editor.*`. Planned for alpha.3.
- **Cut behavior edge cases**: the active-track resolver uses a simple containment check (`startTime < t < endTime`). Tracks muted/hidden as a whole are skipped; per-element `hidden` flags on overlay tracks are not yet considered. We can refine in alpha.3 if it bites.
- **Templates onto timeline**: alpha.4.
- **Live preview while AI edits**: alpha.3.

## v3.0.0-alpha.1 – 2026-05-08 · Foundation (editor + generator + MCP skeleton)

**This is a foundation release**, not a feature release. The actual AI layer + editor wiring lands in v3.0.0-alpha.2 onwards.

### Added
- **`editor/`** — fork of [OpenCut](https://github.com/OpenCut-app/OpenCut) (MIT, Next.js + Bun). Removed `apps/desktop/`, `rust/` and `Cargo.*` (web-only for now). Minimal AIVC DACH branding: title, primary color (neon green `hsl(155, 100%, 50%)`), accent color (violet `hsl(273, 68%, 59%)`), dark default theme.
- **`generator/`** — v2.0.0 code moved from repo root. All paths in `render.js`, `install.sh`, `install.bat`, `smoke-test.py` updated to the new layout. Smoke test green at the new path. Real render test green.
- **`mcp-server/`** — stdio MCP server, Hello-World skeleton. `ping` tool live; `editor.cut`, `editor.trim`, `editor.addClip`, `generator.render` are stubs. End-to-end smoke test (`bun run smoke` → `pong`) green.
- **`shared/`** — brand config example + TypeScript types (`shared/types/brand-config.ts`) shared by editor, generator and mcp-server.
- Top-level **`package.json`** with orchestration scripts: `dev:editor`, `dev:mcp`, `render`, `smoke`.
- **`NOTICE.md`** — third-party attributions (OpenCut, Vercel AI SDK, MCP SDK, Puppeteer, ffmpeg-static, Inter font).
- `editor/apps/web/.env.example` / `.env.local` for local dev (dummy values).
- Bun 1.3.13 added as a system dependency for the editor + mcp-server.

### Changed
- Generator install command: `scripts/install.sh` → `generator/scripts/install.sh` (and `.bat`).
- Generator renderer command: `node renderer/render.js` → `node generator/renderer/render.js`.
- `brand.config.example.json` moved from repo root to `shared/brand.config.example.json`.
- `templates/`, `templates.json`, `examples/` moved into `generator/`.
- README rewritten as a tri-module overview (editor + generator + mcp-server).
- `.gitignore` extended for editor (`node_modules/`, `.next/`, `.env.local`, `.turbo/`, `.wrangler/`) and mcp-server (`node_modules/`, `bun.lockb`).

### License
- Stays **MIT**. OpenCut is also MIT — no copyleft inheritance. The full OpenCut license is preserved at `editor/LICENSE`. Top-level `LICENSE` covers the rest of the repo.
- AGPL was considered but rejected (no obligation to switch; MIT keeps the door open for dual-licensing later).

### Migration from v2.0.0
- v2.0.0 still works at the [v2.0.0 tag](https://github.com/ZeldoGiQ/aivc-dach/releases/tag/v2.0.0).
- Brand config path (`~/.aivc-dach/brand.config.json`) is unchanged — no user-data migration needed.
- If you script against the renderer: update the path from `renderer/render.js` to `generator/renderer/render.js`.

### Tests (all green before PR)
1. Editor: `bun install` → 1933 packages in 65 s · `bun run dev:web` → Ready in 1.6 s · HTTP 200 + `<title>AIVC DACH</title>`.
2. Generator (new path): `python generator/scripts/smoke-test.py` → 0 errors, 0 warnings.
3. Generator real render (new path): `node generator/renderer/render.js --template news-intro` → 30.5 s capture, valid MP4.
4. MCP server: `bun run smoke` → `pong from aivc-dach v0.1.0-alpha — server is live`.

## v2.0.0 – 2026-05-08 · AIVC DACH (rebrand & multilingual)

**Breaking changes.** This is a full rebrand of the project from "Hyperframes Addon by Vibe Coding DACH" to **AIVC DACH by ZELDOgiq & Media AI AT**.

### Added
- **Multilingual helper**: SKILL.md now adapts to the user's language at runtime. Detect from first message, store in `brand.config.json`, switch on demand.
- **Plug-and-play mode**: render immediately after install with sensible defaults. Brand wizard is now optional.
- **Standalone local renderer** with Puppeteer + ffmpeg (no cloud, no API key).
- **System Chrome/Edge fallback**: if Puppeteer's bundled Chromium fails, the renderer uses a locally installed Chrome or Edge automatically. `PUPPETEER_EXECUTABLE_PATH` and `PUPPETEER_SKIP_DOWNLOAD` are honored.
- **Auto config migration**: legacy `~/.hyperframes-vbc/brand.config.json` is **copied** (not moved) to `~/.aivc-dach/` on first run, with an explicit log line. Old folder is left untouched.
- **Auto smoke render** at the end of `install.sh` / `install.bat`. Failure is non-fatal; templates and config are still installed.
- **`ffmpeg-static` fallback**: bundled with the renderer; used automatically if no system `ffmpeg` is on `PATH`. Multi-step detection: PATH → common paths → `ffmpeg-static`.
- **Faster Whisper is optional and non-blocking**. Missing pip / missing Python no longer kills the install.
- **Google Fonts** preconnect + Inter / Fraunces / JetBrains Mono in every template.
- **`__seekToTime`** helper in every template – consistent animation time-travel between browser preview and renderer.
- **Auto-fit preview scaling** in every template (`--preview-scale` CSS var) – HTML preview adapts to any browser size, MP4 render is unaffected.
- **`TROUBLESHOOTING.md`** with the 7 most common issues and fixes.
- **`.github/ISSUE_TEMPLATE/`** with bug, feature, and new-template templates.
- **English default copy** in all 6 templates.

### Changed
- **Project renamed**: `hyperframes-vibecoding-dach` → `aivc-dach` on GitHub. Old URL redirects automatically.
- **Config directory**: `~/.hyperframes-vbc/` → `~/.aivc-dach/` (with auto-migration).
- **Repo content** is now in **English** (code, comments, docs, commit messages). The helper still speaks the user's language.
- **License copyright**: `Vibe Coding DACH` → `ZELDOgiq & Media AI AT`.
- **Renderer naming**: `hyperframes-vbc-renderer` → `aivc-dach-renderer`, bin `aivc-dach-render`.
- **Vibe Coding DACH** is now positioned as the **community** behind AIVC DACH (Skool group), not as the owner.
- README quickstart split into **Lazy Mode** (one Claude prompt) and **Manual Mode** (`git clone`).
- Default `language` in `brand.config.example.json`: `"de"` → `"auto"`.

### Fixed
- The legacy `git clone heygen/hyperframes` step (which produced HTTP 404 in v1.0.0) is fully gone.

### Migration from v1.x
- The renderer auto-copies your old `~/.hyperframes-vbc/brand.config.json` to `~/.aivc-dach/` on first run.
- After verifying the new path works you can delete `~/.hyperframes-vbc/` manually.
- If you cloned the v1.x repo, `git remote set-url origin https://github.com/ZeldoGiQ/aivc-dach.git`.

## v1.1.0 – 2026-05-08 · Standalone renderer (deprecated)

### Added
- Standalone local renderer (`renderer/`) with Puppeteer + ffmpeg.
- CLI: `--template`, `--vars`, `--output`, `--fps`, `--preview`, `--keep-frames`, `--quiet`.
- Conditional template blocks `{{#if VAR}}…{{/if}}`.
- Smoke-test extension for the renderer.

### Changed
- Replaced `git clone heygen/hyperframes` with the local renderer.
- Install scripts simplified (5 steps instead of 6).

## v1.0.0 – 2026-05-07 · Initial release (deprecated)

- First public release as "Hyperframes Addon by Vibe Coding DACH".
- 6 format templates, brand wizard, install scripts, smoke test.
- Deprecated due to incorrect Hyperframes assumption (HeyGen's product is cloud-only, not open-source).
