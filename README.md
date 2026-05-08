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
2. **Edit** raw footage with AI assistance — the editor's chat sidebar can cut, trim, add clips, drop a generated intro on the timeline, all via the **MCP server**.
3. **Mix providers**: Claude (default), OpenAI or local Ollama via the Vercel AI SDK. BYOLLM.

This `v3.0.0-alpha.1` release is the **foundation**: branch + OpenCut fork + generator move + MCP skeleton. The actual AI integration (chat sidebar wired to MCP, drag-and-drop templates, bidirectional state sync) lands in subsequent v3.0.0-alpha.x and the v3.0.0 stable release.

---

## 🚦 Status of each module (alpha.1)

| Module | What works today | What's coming |
|---|---|---|
| `editor/` | OpenCut fork builds & runs (`bun run dev:web` → http://localhost:3000), AIVC DACH branding (title, primary/accent colors, dark default) | Full branding pass, AI chat sidebar, MCP wiring, template drag-and-drop |
| `generator/` | All v2.0.0 features (6 templates, renderer, install scripts, smoke test) work unchanged at the new path | None planned — feature-complete for now |
| `mcp-server/` | stdio server, `ping` tool live, 4 stub tools defined for editor + generator | Real implementations: `editor.cut`, `editor.trim`, `editor.addClip`, `generator.render` |
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
| **v3.0.0-alpha.1** | Foundation (this PR) | Branch + OpenCut fork + generator move + MCP skeleton |
| v3.0.0-alpha.2 | AI layer | Vercel AI SDK + Anthropic / OpenAI / Ollama providers, chat sidebar shell |
| v3.0.0-alpha.3 | MCP wiring | `editor.cut`, `editor.trim`, `editor.addClip` connect to OpenCut's Zustand store |
| v3.0.0-alpha.4 | Templates → editor | Drag-and-drop generator templates onto the timeline, live render preview |
| v3.0.0-alpha.5 | State sync | Bidirectional: chat ↔ timeline live updates |
| **v3.0.0** | Stable | Full branding pass, real production env, end-to-end smoke (footage → cut → drop intro → export) |
| v3.1.0 | Polish | Native AIVC logo, custom Inter weights, tutorial videos |

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
- **AI layer (planned):** [Vercel AI SDK](https://github.com/vercel/ai) — Anthropic / OpenAI / Ollama providers
- **Community:** [Vibe Coding DACH](https://www.skool.com/vibe-coding-dach) Skool (German-speaking creators — courses, premium templates, live workflow reviews)
