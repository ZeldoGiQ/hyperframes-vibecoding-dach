# 📥 Installation – step by step

You don't need any technical background. Just follow this guide.

---

## Prerequisites

The only thing you install yourself is **Claude Code**. The installer takes care of everything else.

👉 [Install Claude Code](https://docs.claude.com/en/docs/claude-code) (free)

---

## Method 1: With Claude Code (recommended)

Easiest way. You tell Claude what to do.

**Step 1:** Open an empty folder on your computer (e.g. `Documents/Videos`).

**Step 2:** Start Claude Code in that folder.

**Step 3:** Paste this prompt:

```
Install AIVC DACH from
https://github.com/ZeldoGiQ/aivc-dach

Do everything automatically:
1. Clone the repo
2. Check & install missing dependencies
3. Install the local renderer (cd renderer && npm install)
4. Register SKILL.md
5. Run a test render
```

**That's it.** Claude walks you through step by step.

---

## Method 2: Manual (for devs)

### Windows

```bash
git clone https://github.com/ZeldoGiQ/aivc-dach.git
cd aivc-dach
scripts\install.bat
```

### Mac/Linux

```bash
git clone https://github.com/ZeldoGiQ/aivc-dach.git
cd aivc-dach
chmod +x scripts/install.sh
./scripts/install.sh
```

---

## What gets installed?

| Component | Why you need it |
|-----------|----------------|
| **Node.js (≥ 18)** | Runs the local renderer |
| **Puppeteer + Chromium** | Headless browser for frame capture (~150 MB, one-shot via npm) |
| **ffmpeg** | Encodes the frames into an MP4 (falls back to `ffmpeg-static` if missing) |
| **Python 3.11+** | Optional, for Faster Whisper |
| **Faster Whisper** | Subtitle generation from audio (planned for v2.1) |
| **Git** | Auto-updates |

If something is missing, Claude tells you exactly how to install it.

---

## Storage locations

After install, your files live here:

| What | Where |
|-----|-----|
| Repo + templates | wherever you ran `git clone` |
| Renderer | `<REPO>/renderer/` (`render.js`, `node_modules/`, …) |
| Brand config | `~/.aivc-dach/brand.config.json` |
| Your logos | `~/.aivc-dach/assets/` |
| Rendered videos | `./output/` (in the working directory you launch Claude from) |

If you previously used **v1.x** with `~/.hyperframes-vbc/`, the installer copies your config to `~/.aivc-dach/` automatically. The old folder is left untouched – delete it manually when you're sure.

---

## Trouble during installation?

**Problem:** "Node.js not found"
- **Fix:** [Download Node.js](https://nodejs.org/) (recommended version)

**Problem:** "Python not found"
- This is **optional**. Subtitle features need it, video rendering does not. You can skip safely.
- Windows: [Python from python.org](https://www.python.org/downloads/) – tick "Add to PATH" during install.
- Mac: `brew install python@3.11`
- Linux: `sudo apt install python3 python3-pip`

**Problem:** "ffmpeg not found"
- The renderer auto-falls-back to `ffmpeg-static` (bundled). You don't have to install it manually.
- If you want it system-wide:
  - Windows: `winget install Gyan.FFmpeg`
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

**Problem:** "Chromium download failed" / Puppeteer fails
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) – the renderer can use your locally installed Chrome or Edge as a fallback.

**Other problems**
- Open an issue: https://github.com/ZeldoGiQ/aivc-dach/issues
- Or ask the **Vibe Coding DACH** community: https://www.skool.com/[SKOOL-LINK]

---

## First run

After a successful install:

1. Open Claude Code in any folder.
2. Say: `Make a news intro about AI` (no setup required – plug-and-play mode).
3. Want personal branding? Say: `Set up brand` and answer 5 questions.

🎉 **Done.**
