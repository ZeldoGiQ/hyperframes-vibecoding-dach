# 📥 Installation — AIVC DACH alpha.2

Two flavours of the project, two install paths. Pick the one you need:

- **A) The AI editor + overlay engine** (alpha.2 — what most new users want) — Bun + Puppeteer + ffmpeg + AI provider. ~10 min.
- **B) The generator CLI alone** (v2.0 standalone MP4 templates) — Node only. ~3 min.

Most people want **A**. **B** is for headless / scripted MP4 rendering without the editor UI.

---

## A) AI editor + overlay engine

### A1. Prerequisites

| What | Why | How to install |
|---|---|---|
| **Bun ≥ 1.3** | Package manager + runtime for the editor and the overlay-render pipeline | https://bun.sh — `curl -fsSL https://bun.sh/install \| bash` on macOS/Linux, `powershell -c "irm bun.sh/install.ps1 \| iex"` on Windows |
| **Git** | Clone the repo | https://git-scm.com |
| **A modern Chrome** (system install) | Not strictly required — Puppeteer downloads its own copy in step A3 — but having one locally helps for debugging | https://www.google.com/chrome/ |
| **An AI provider API key** | Drives the chat. One of Anthropic, Google, OpenAI, or a local Ollama install | See A4 below |

### A2. Clone and pick the alpha.2 branch

```bash
git clone https://github.com/ZeldoGiQ/aivc-dach.git
cd aivc-dach
git checkout v3.0.0-alpha.2-ai-layer   # until alpha.2 is merged into main
```

### A3. One-shot setup (Windows + macOS + Linux)

From the repo root:

```bash
# Windows (cmd or PowerShell):
scripts\setup-editor.bat

# macOS / Linux:
chmod +x scripts/setup-editor.sh
./scripts/setup-editor.sh
```

The script does five things in order:

1. `bun install` from `editor/` (Turborepo workspaces resolve everything).
2. `bun install` from `editor/apps/web/` (paranoia — should be a no-op after step 1).
3. **Runs `ffmpeg-static`'s postinstall manually.** Bun's default is `--no-postinstall`, so the ffmpeg binary was never downloaded. The script does it for you (`node node_modules/ffmpeg-static/install.js`).
4. **Downloads the matching Chrome for Puppeteer 24** (`bun x puppeteer browsers install chrome` — ~200 MB, one-shot).
5. Copies `editor/apps/web/.env.example` → `editor/apps/web/.env.local` if the latter doesn't exist yet.

If you'd rather run the steps manually, A3 is just those five commands — see the bottom of this file.

### A4. Pick an AI provider

Open `editor/apps/web/.env.local` and set two values:

```env
AIVC_AI_PROVIDER=anthropic     # or: google | openai | ollama
ANTHROPIC_API_KEY=sk-ant-…     # the key for the provider you chose
ANTHROPIC_MODEL=               # required — see the link in the file
```

**Model selection is per-provider and required** — there's no fallback, because provider lineups change too fast for hardcoded defaults to age well. Each provider block in `.env.example` links to its official model list. Pick whatever's current:

| Provider | API key | Model docs |
|---|---|---|
| Anthropic | https://console.anthropic.com/settings/keys | https://docs.anthropic.com/en/docs/about-claude/models |
| Google (Gemini) | https://aistudio.google.com/app/apikey | https://ai.google.dev/gemini-api/docs/models |
| OpenAI | https://platform.openai.com/api-keys | https://platform.openai.com/docs/models |
| Ollama (local) | — (free, runs offline) | https://ollama.com/library (run `ollama pull <id>` first) |

> ⚠️ Tip on small models: cheap/fast models like `gemini-3.1-flash-lite` work for simple tools (cut, listTemplates, addOverlay with built-in templates) but tend to skimp on `editor.renderCustomOverlay`, where they have to emit a full HTML document. If custom designs come back empty or trivial, switch `*_MODEL` to a heavier model (e.g. `gemini-2.5-pro`, `claude-sonnet-4-5`) for that session.

### A5. Run

From `editor/apps/web/`:

```bash
bun run dev
```

The dev server starts at **http://localhost:3000**. Open it in **Chrome** (mediabunny needs WebCodecs + WebGL2 — Firefox / Safari are degraded; a banner reminds you).

Create a project, drop a video clip into the assets panel, and click the green **AI Chat** button in the top-right of the preview area.

Try:
- `What's on the timeline?`
- `Cut at 3 seconds`
- `Mach Lower Third mit Hannes Founder bei 5 Sekunden`
- `Mach Endcard am Ende mit AIVC Branding`
- `Mach einen CTA mit "Abonniere den Kanal"`
- *(after a custom design you like)* `Speicher das als Template`

### A6. Storage layout

| What | Where |
|---|---|
| Rendered overlay WebMs (cache, can delete safely) | `editor/apps/web/.aivc-cache/overlays/` |
| Saved templates (`speicher das als Template`) | `generator/overlays/<slug>/` |
| Bundled templates that ship with the repo | `generator/overlays/{lower-third, title-card, …}/` |
| Your project (OpenCut IndexedDB) | Browser-local, in Chrome's site storage for `localhost:3000` |
| Your API key | `editor/apps/web/.env.local` — gitignored, **never** leaves your disk |

---

## B) Generator CLI only

For the v2.0 standalone MP4 templates (`news-intro`, `promo-clip`, …) without the editor UI.

```bash
git clone https://github.com/ZeldoGiQ/aivc-dach.git
cd aivc-dach
# Windows:
generator\scripts\install.bat
# macOS / Linux:
chmod +x generator/scripts/install.sh
./generator/scripts/install.sh
```

This installs Node, Puppeteer + Chromium, and ffmpeg-static into `generator/renderer/node_modules/`. Then render with:

```bash
node generator/renderer/render.js --template news-intro --vars '{"TOPIC":"Gemini 4 is here"}'
```

Output lands in `generator/output/`.

---

## Trouble during installation?

**Problem:** `bun: command not found`
- Bun was installed but isn't on PATH yet. Open a fresh terminal (the installer prints the PATH line you may need to add to `~/.bashrc` / `~/.zshrc` / `$PROFILE` for PowerShell).

**Problem:** `Could not find Chrome (ver. 148.…)` when the first overlay render runs
- Step A3.4 didn't run, or it ran for an older Puppeteer. From `editor/apps/web/`:
  ```bash
  bun x puppeteer browsers install chrome
  ```

**Problem:** `spawn \ROOT\node_modules\.bun\…\ffmpeg.exe ENOENT`
- Bun didn't run `ffmpeg-static`'s postinstall. From `editor/apps/web/`:
  ```bash
  node node_modules/ffmpeg-static/install.js
  ```

**Problem:** `Bitte ANTHROPIC_API_KEY in editor/apps/web/.env.local setzen`
- The selected provider has no key set. Open `.env.local` and fill in the key for whichever provider matches `AIVC_AI_PROVIDER`.

**Problem:** `<PROVIDER>_MODEL nicht gesetzt`
- You picked a provider but didn't pick a model. The error message links you to the provider's model docs — paste the id you want into the matching `*_MODEL` env var.

**Problem:** AI says it added an overlay but the preview is a black rectangle
- You're probably on an old cached build. Hard-refresh the page (`Ctrl+Shift+R`) so mediabunny re-initialises its video cache with `alpha: true`. If still broken, clear `editor/apps/web/.aivc-cache/overlays/` and try again.

**Problem:** Custom-rendered overlay (`editor.renderCustomOverlay`) is empty or comes back as just a tiny element
- Your model is too small to emit a full HTML document. Switch to a heavier model in `.env.local` and retry.

**Other problems**
- Open an issue: https://github.com/ZeldoGiQ/aivc-dach/issues
- Or ask the **[Vibe Coding DACH](https://www.skool.com/vibe-coding-dach) Skool community**.

---

## Manual setup (if scripts/setup-editor.* refuses to run)

Each step on its own:

```bash
# from repo root
cd editor
bun install

cd apps/web
bun install
node node_modules/ffmpeg-static/install.js
bun x puppeteer browsers install chrome
cp .env.example .env.local   # then edit .env.local
bun run dev
```

Done.
