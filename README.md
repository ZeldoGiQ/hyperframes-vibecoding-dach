# 🎬 AIVC DACH

**AI-first video editor + generator in one repo.** Tell Claude what you want, get an MP4 back. Open source, fully local, no accounts, no API keys for the renderer.

> by **ZELDOgiq & Media AI AT**
> Status: **v3.0.0-alpha.1 (foundation)** · v2.0.0 generator-only release is still live and supported

```
aivc-dach/
├── editor/        # AI-driven video editor — fork of OpenCut (Next.js + Bun)
├── generator/     # HTML/CSS templates → MP4 (Puppeteer + ffmpeg) — formerly v2.0.0
├── mcp-server/    # Model Context Protocol stdio server, exposes editor + generator tools to AI agents
└── shared/        # brand config + TypeScript types shared across modules
```

---

## ✨ Vision

A single tool that lets non-technical creators:

1. **Generate** ready-to-use intros, outros, shorts and sponsor reads from a one-line prompt (the v2.0.0 workflow).
2. **Edit** raw footage with AI assistance — the editor's chat sidebar can cut, trim, add clips, render transparent overlays (lower-third, endcard, custom CSS designs, …) and drop them on a fresh track. External agents (Claude Code, Cursor) connect via the **MCP server** in alpha.3+.
3. **Mix providers**: Anthropic (default), Google Gemini, OpenAI or local Ollama via the Vercel AI SDK. BYOLLM.

This `v3.0.0-alpha.2` release wires the **AI layer + overlay engine** end-to-end. The chat sidebar can cut/trim/add clips, drop one of seven built-in overlay templates onto a fresh overlay track, render fully custom HTML/CSS designs, and save a hit as a reusable template — all transparently composited over the footage. Bidirectional state sync (UI → chat) and the MCP-server bridge for external agents land in alpha.3+.

---

## 🚦 Status of each module (alpha.2)

| Module | What works today | What's coming |
|---|---|---|
| `editor/` | OpenCut fork builds & runs (`bun run dev` from `editor/apps/web` → http://localhost:3000). AI chat sidebar with 10 tools: getState, cut, trim, addClip, listTemplates, addOverlay, modifyOverlay, removeOverlay, renderCustomOverlay, saveAsTemplate. WebM-alpha overlay pipeline (Puppeteer → VP8 with BlockAdditions alpha → mediabunny composit). | Bidirectional state sync, MCP-server bridge, generator-template drag-and-drop |
| `generator/` | v2.0.0 CLI (6 standalone MP4 templates) + 7 new **overlay templates** (`generator/overlays/`, transparent WebMs rendered on demand by the editor) | None planned — both pipelines are stable |
| `mcp-server/` | stdio server, `ping` tool live, 4 stub tools defined for editor + generator. Real `editor.*` tools live in the editor for alpha.2. | WebSocket bridge to the running browser tab so external agents (Claude Code, Cursor) can drive the timeline too — alpha.3 |
| `shared/` | brand config + TypeScript types | Templates manifest (Phase 5) |

---

## 🚀 Quickstart per module

### Generator (works today, identical to v2.0.0)

```bash
git clone https://github.com/ZeldoGiQ/aivc-dach
cd aivc-dach
generator/scripts/install.sh         # macOS / Linux
# or:
generator\scripts\install.bat        # Windows
```

Then in Claude Code:

```
Make a news intro about Gemini 4 with subtitle "Google's new AI model"
```

Output: `output/news-intro-<timestamp>.mp4`.

### Editor (foundation, dev-server only)

```bash
cd editor
bun install
cp apps/web/.env.example apps/web/.env.local   # dummy values are fine for local UI work
bun run dev:web                                # opens http://localhost:3000
```

> Note: the editor inherits OpenCut's auth, DB and CMS dependencies. The dummy values in `.env.local` are enough to load the page; cloud calls fail gracefully. Real production secrets land in v3.0.0.

### MCP server (stdio)

```bash
cd mcp-server
bun install
bun run smoke            # initialize → tools/list → ping → expects "pong"
```

To wire into Claude Code, add to `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "aivc-dach": {
      "command": "bun",
      "args": ["run", "/abs/path/to/aivc-dach/mcp-server/server.ts"]
    }
  }
}
```

---

## 🔁 Migration from v2.0.0

If you're running v2.0.0 today: **nothing breaks immediately**. v2.0.0 lives at the [`v2.0.0` tag](https://github.com/ZeldoGiQ/aivc-dach/releases/tag/v2.0.0) and on the `main` branch until v3.0.0 stable replaces it.

What changes in v3.0.0:
- Generator moved from repo root to `generator/`. The renderer command is now `node generator/renderer/render.js` (instead of `node renderer/render.js`).
- `brand.config.example.json` moved from repo root to `shared/`.
- New `editor/` and `mcp-server/` modules.
- Top-level scripts orchestrate all modules: `bun run dev:editor`, `bun run smoke`, `bun run render`.
- Brand config path (`~/.aivc-dach/brand.config.json`) is **unchanged**. No user-data migration needed.

---

## 🧪 Smoke tests

```bash
bun run smoke              # generator (Python) + mcp-server (Bun)
bun run smoke:generator    # just the v2.0.0 templates / renderer check
bun run smoke:mcp          # just the MCP stdio dance
```

Both are green for v3.0.0-alpha.1. The editor doesn't have a CI smoke yet — that's part of v3.0.0.

---

## 🗺️ Roadmap

| Version | Phase | Scope |
|---|---|---|
| v3.0.0-alpha.1 | Foundation | Branch + OpenCut fork + generator move + MCP skeleton |
| **v3.0.0-alpha.2** | AI layer + overlay engine (this PR) | Vercel AI SDK + 4 providers, 10 editor tools, 7 overlay templates, custom-HTML render + save-as-template, WebM-alpha pipeline |
| v3.0.0-alpha.3 | MCP bridge + bidir state | WebSocket bridge from stdio MCP server to running browser tab; chat observes UI-driven edits; live preview during AI edits |
| v3.0.0-alpha.4 | Generator → editor | Drag-and-drop generator MP4 templates onto the timeline |
| **v3.0.0** | Stable | Full branding pass, real production env, end-to-end smoke (footage → cut → overlay → export) |
| v3.1.0 | Polish | Native AIVC logo, custom Inter weights, tutorial videos |

---

## 🔌 Configuring the AI provider

The chat sidebar in the editor talks to one of four LLM providers, picked via env vars in `editor/apps/web/.env.local` (copy from `.env.example`). **You pick the model**: AIVC DACH does not hardcode model names because provider lineups change too quickly to keep current. Set the `*_MODEL` env var to whatever's listed in the provider's official model docs at the time you set things up:

| Provider | API key env | Model env | Pick a current model id from |
|---|---|---|---|
| Anthropic *(default)* | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` | https://docs.anthropic.com/en/docs/about-claude/models |
| Google (Gemini) | `GOOGLE_GENERATIVE_AI_API_KEY` | `GEMINI_MODEL` | https://ai.google.dev/gemini-api/docs/models |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | https://platform.openai.com/docs/models |
| Ollama (local) | — | `OLLAMA_MODEL` | https://ollama.com/library (also: `ollama pull <id>` first) |

Switch providers by setting `AIVC_AI_PROVIDER=anthropic|google|openai|ollama`. If a `*_MODEL` env var is empty when the chosen provider runs, the chat surfaces a German error pointing you at the docs URL above — no silent fallback to a possibly-deprecated default.

---

## 🆘 Help

| Command | What it does |
|---|---|
| `AIVC help` | Show all commands |
| `AIVC reset` | Reset the brand config (`generator/scripts/reset.*`) |
| `AIVC update` | `git pull` + reinstall renderer / editor / mcp-server deps |
| `Set up brand` | Run the (optional) brand wizard |
| `Make a <format>` | Render a generator template (works today) |
| `Open editor` | Start the editor dev-server (works today, no AI yet) |

---

## 🛠️ Requirements

| Tool | Used for | Required? |
|---|---|---|
| Claude Code | Skill integration & "one prompt" workflow | ✅ |
| Node.js (≥ 18) | Generator renderer (Puppeteer + ffmpeg) | ✅ |
| Bun (≥ 1.2) | Editor (OpenCut fork) + MCP server | ✅ |
| Git | Repo cloning + updates | ✅ |
| ffmpeg | Frame encoding (auto-fallback to `ffmpeg-static`) | optional |
| Python 3.11+ | Faster Whisper subtitles (planned) | optional |

**Supported systems:** Windows 10/11, macOS, Linux.

---

## 🩺 Troubleshooting

See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) for the 7 most common issues (Chromium download, ffmpeg, permissions, …). Editor-specific issues (env vars, OpenCut deps) will be added in v3.0.0.

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE). Third-party attributions in [`NOTICE.md`](./NOTICE.md).

The editor under `editor/` is a fork of [OpenCut](https://github.com/OpenCut-app/OpenCut) (also MIT). OpenCut's full license text is preserved at [`editor/LICENSE`](./editor/LICENSE).

---

## 🤝 Credits

- **Owned and maintained by** ZELDOgiq & Media AI AT
- **Editor foundation:** [OpenCut](https://github.com/OpenCut-app/OpenCut) (MIT)
- **Generator:** Puppeteer + ffmpeg, six templates inspired by Hyperframes-style workflows
- **MCP server:** Built on [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **AI layer:** [Vercel AI SDK](https://github.com/vercel/ai) — Anthropic / Google / OpenAI / Ollama providers
- **Community:** [Vibe Coding DACH](https://www.skool.com/vibe-coding-dach) Skool (German-speaking creators — courses, premium templates, live workflow reviews)
