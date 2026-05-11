# Changelog

All notable changes to AIVC DACH.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## v3.0.0-alpha.2 – 2026-05-11 · AI layer + overlay engine

End-to-end: the user types a prompt in the chat sidebar, the AI plans on the timeline, calls editor tools, and either renders a built-in overlay template or designs a fresh one from HTML/CSS — all composited transparently over the footage.

### Added — AI layer (cut/trim/clip)
- **`editor/apps/web/src/ai/`** — Vercel AI SDK 6 integration:
  - `tools.ts` — Zod schemas for ten tools shared between server and client.
  - `tool-executor.ts` — client-side execution against `EditorCore.getInstance()`. Mutations go through OpenCut's command pattern (`splitElements`, `updateElements`, `insertElement`, `addTrack`, `deleteElements`), so undo/redo Just Works.
  - `selection-resolver.ts` — for `editor.cut`, finds all clips active at a timestamp across video, audio, overlay tracks. Default: skip muted audio + hidden visual tracks.
  - `time-utils.ts` — seconds ↔ `MediaTime` (WASM tick) conversion at the boundary.
  - `provider.ts` — Anthropic (default), Google (Gemini), OpenAI, Ollama selectable via `AIVC_AI_PROVIDER`. No hardcoded model names — `ANTHROPIC_MODEL`, `GEMINI_MODEL`, `OPENAI_MODEL`, `OLLAMA_MODEL` env vars. Missing key/model → German error with a link to the provider's docs.
  - `overlay-registry.ts` — `Map<elementId, {template, vars, styleVars, customHtml, mediaId, …}>` pinned on `globalThis` so modify/remove tools can find overlays even after Next.js dev module isolation.
  - `components/chat-sidebar.tsx` + `components/tool-call-display.tsx` — collapsible right-side chat panel with streaming, tool-call visualisation (status, input/output JSON, "Cached" vs "Rendered in X.Xs" badge), error surfacing.
- **`/api/ai/chat`** — Next.js route handler using `streamText`. Returns 400 + structured error if the selected provider is misconfigured.
- **`.env.example`** — `AIVC_AI_PROVIDER` + per-provider `*_API_KEY` / `*_MODEL` pairs with links to each provider's model docs.
- **Editor page**: prominent neon-green "AI Chat" toggle (top-right of preview area) opens the sidebar; close button collapses it.

### Added — Overlay engine
- **`generator/overlays/`** — seven transparent-background overlay templates with `meta.json` (variables, styleVars, default duration) and `template.html` (CSS-only animations, single Inter font):
  - `lower-third`, `title-card`, `logo-watermark`, `subtitle-card`, `cta-banner`, `logo-reveal`, `endcard`.
- **`editor/apps/web/src/services/overlay-renderer/`** — HTTP-driven render pipeline:
  - Puppeteer headless Chrome captures frames at 30 fps with `omitBackground: true`.
  - Web Animations API is paused and stepped per frame for deterministic output.
  - `ffmpeg-static` encodes to **WebM with VP8 alpha** (`libvpx -pix_fmt yuva420p -auto-alt-ref 0 -crf 18 -metadata:s:v:0 alpha_mode=1`). VP8 because mediabunny's WebM demuxer detects alpha only via per-Block BlockAdditions — VP9's encoding mechanism is invisible to it. See "Friction notes" below.
  - SHA-256 cache keyed by `{template OR html, vars, styleVars, durationSeconds, width, height}` under `editor/apps/web/.aivc-cache/overlays/<hash>.webm`. Cache hits return in ~1 ms; fresh renders take ~5–12 s depending on duration.
  - In-memory job store pinned on `globalThis` for cross-route persistence in dev mode.
- **`/api/overlays/render`** — POST `{ template | html, vars, styleVars?, durationSeconds?, width?, height? }` → `{ jobId, status, hash }`. Schema enforces exactly one of `template` or `html`.
- **`/api/overlays/jobs/[jobId]`** — GET → live job state with progress.
- **`/api/overlays/files/[hash]`** — GET → `video/webm`, immutable cache headers.
- **`/api/overlays/templates`** — GET → all overlay templates with their full meta.json.
- **`/api/overlays/save-template`** — POST → persists a custom overlay as `/generator/overlays/<slug>/`. Generates a slug from the AI-supplied name (≤60 chars), avoids collisions automatically.
- **`/api/overlays/test-page?h=<hash>`** — undocumented dev tool, renders the overlay over a pink/green diagonal so transparency can be verified independent of OpenCut.

### Added — Overlay AI tools (six new on top of the four cut/trim/addClip/getState ones)
| Tool | Purpose |
|---|---|
| `editor.listTemplates` | Discover overlay templates + variable schemas |
| `editor.addOverlay` | Render an existing template (vars + styleVars) on a fresh overlay track |
| `editor.modifyOverlay` | Re-render a placed overlay with patched vars/styleVars/duration (defaults to most recent) |
| `editor.removeOverlay` | Delete an overlay (defaults to most recent) |
| `editor.renderCustomOverlay` | Render arbitrary AI-generated HTML/CSS — for designs no built-in covers |
| `editor.saveAsTemplate` | Persist the last custom overlay as a reusable template; AI generates a name (≤60 chars) from the original request |

### Changed
- **`mcp-server/README.md`** — clearly marks the stdio server as held back for alpha.3. Real `editor.*` tools live in the editor itself for alpha.2; the WebSocket bridge from the stdio server to the running browser tab lands in alpha.3.
- **`editor/apps/web/src/services/video-cache/service.ts`** — one-line change: `alpha: true` on `CanvasSink` so mediabunny's WebGL2-based `ColorAlphaMerger` is wired up for transparent overlays. Opaque footage is unaffected.

### Dependencies (editor/apps/web)
- `ai@^6`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/react`, `ollama-ai-provider-v2` — chat layer.
- `puppeteer@^24`, `ffmpeg-static@^5` — overlay render pipeline.

### Friction notes resolved during the build
- **`onToolCall` deadlock.** Vercel AI SDK 6's `SerialJobExecutor` deadlocks if `onToolCall` awaits `addToolOutput` while the stream is still running. Fix: fire-and-forget `addToolOutput().then().catch()` inside the inner async IIFE in `chat-sidebar.tsx`.
- **`addTrack` + `insertElement` pruning race.** OpenCut's `CommandManager` runs a reactor after every command that filters overlay tracks with zero elements. The naive sequence `addTrack` → `insertElement` lost the new track to the reactor before the insert landed. Fix: wrap both commands in a single `BatchCommand`.
- **Bun's `--no-postinstall`.** `bun add ffmpeg-static` doesn't run the postinstall that downloads the binary, so ffmpeg.exe was missing. `resolveFfmpegBinary` now falls back to `node_modules/ffmpeg-static/ffmpeg.exe` when ffmpeg-static returns the Bun virtual `\ROOT\…` path.
- **Puppeteer 24 ↔ Chrome 148 mismatch.** Listed in `INSTALL.md`: `bun x puppeteer browsers install chrome` after install.
- **Next.js Turbopack module isolation.** Plain module-level `Map`s disappear between POST and GET handlers in dev mode. Both the job store and the overlay registry pin themselves on `globalThis`.
- **Provider lineup drift.** No hardcoded model names — `*_MODEL` env vars are required, missing them produces a clear German error pointing at the provider's official model docs.
- **9:16 / portrait projects.** Cache key now includes width/height; render pipeline accepts a viewport size and injects `html,body{width:Xpx !important;height:Ypx !important}` so templates designed for 16:9 still fill a 9:16 canvas.
- **VP9 alpha vs mediabunny.** Switched encoder from `libvpx-vp9` to `libvpx` (VP8). VP9 with `yuva420p` produces WebMs that Chrome's `<video>` and editing software (Premiere etc.) decode correctly, but mediabunny detects alpha only via per-Block BlockAdditions — only VP8's encoding produces those. Output files are ~2× larger but still small in absolute terms (≈250 KB for 5 s).

### Known scope cuts (deferred)
- **Bidirectional state sync** (UI → chat awareness): chat does not yet observe UI-driven edits. Planned for alpha.3.
- **MCP-server WebSocket bridge** to running browser tab: alpha.3 (lets external agents like Claude Code drive the timeline).
- **Live preview while AI edits**: alpha.3.
- **Generator-MP4 → timeline drag-and-drop**: alpha.4.

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
