# 🎬 AIVC DACH

**Create professional videos with Claude Code – fully local, in minutes instead of hours.**

> by **ZELDOgiq & Media AI AT**

A standalone video renderer for non-technical users. The repo ships with 6 production-ready format templates, a brand wizard, and a Claude Code skill that adapts to your language. The renderer is **fully local** – Puppeteer + ffmpeg under the hood, no cloud account, no API key, no upload of your data.

---

## 🚀 Lazy Mode – install in 30 seconds

**1. Open Claude Code in any empty folder.**

**2. Paste this single command:**

```
Install AIVC DACH from
https://github.com/ZeldoGiQ/aivc-dach
and run the full setup.
```

**3. Done.** Claude installs everything, runs a test render and you're ready to go. The brand wizard is **optional** – the renderer works out of the box with sensible defaults.

After installation just say things like:

> *"Make a news intro about the new Claude Opus update"*

The helper picks the right template, asks only for what's missing, and renders an MP4.

---

## 🧠 Manual Mode – for devs

```bash
git clone https://github.com/ZeldoGiQ/aivc-dach
cd aivc-dach
./scripts/install.sh         # macOS / Linux
# or:
scripts\install.bat          # Windows
```

The installer downloads Puppeteer's Chromium (~150 MB, one-shot), installs the renderer dependencies, and runs a smoke render at the end.

---

## 🌐 Multilingual helper

The Claude skill adapts to your language at runtime. Defaults:

- `language: "auto"` (set in `~/.aivc-dach/brand.config.json`) – the helper detects the language from your first message and remembers it.
- `language: "en" | "de" | "es" | …` – fixed.

You can switch at any time by saying:

> *"Switch to English"* · *"Auf Deutsch wechseln"* · *"Cambia a español"*

The repo content (code, docs, comments) is in **English**, but the helper output (questions, errors, hints) is in **your** language.

---

## 🎯 What you can build

Six ready-made video formats, each one prompt away:

| Format | Length | Example prompt |
|--------|--------|----------------|
| 📰 **News Intro** | 10 s | `Make a news intro about Gemini 4` |
| 🎯 **Promo Clip** | 30 s | `Create a promo clip for my product XY` |
| 🎓 **Tutorial Outro** | 15 s | `Build me an outro with a subscribe reminder` |
| 💰 **Sponsor Read** | 20 s | `Sponsor read for [brand] with logo` |
| 📱 **Vertical Short** | 9:16 | `Make this as a TikTok short` |
| 🎙️ **Podcast Intro** | 15 s | `Podcast intro with waveform animation` |

---

## ✨ What this addon does well

- **🌐 Multilingual** – English, German, and any language Claude understands
- **🛡️ Plug-and-play** – render right after install, the brand wizard is optional
- **🎨 Brand wizard** – set it up once, used in every render
- **📦 Format templates** – pre-built building blocks, no coding needed
- **🔁 Reset command** – when something breaks, reset and start over
- **🎁 100 % free & open source** (MIT)

---

## 📚 Quickstart after install

The helper is in **plug-and-play mode** by default:

> *"Make a news intro about the new Claude Opus update"*

… and you get a finished MP4 with sensible defaults. Want personal branding? Run the wizard whenever you like:

> *"Set up brand"*

Five short questions:

1. Brand / channel name
2. Primary color (`#FF5733` or `"don't know"` for suggestions)
3. Accent color
4. Heading font (or `"don't know"`)
5. Logo path (or `skip`)

That's it. Your config lives in `~/.aivc-dach/brand.config.json`.

---

## 🆘 Help & commands

Recognized in any common language:

| English | German | What it does |
|---------|--------|--------------|
| `AIVC help` | `AIVC Hilfe` | Show all commands |
| `AIVC reset` | `AIVC zurücksetzen` | Reset the addon |
| `AIVC update` | `AIVC aktualisieren` | `git pull` + reinstall renderer deps |
| `Set up brand` | `Brand einrichten` | Run the wizard |
| `Show examples` | `Beispiele zeigen` | Open the example gallery |
| `Render preview` | `Vorschau anzeigen` | Render HTML only (no MP4) |

---

## 🎓 Community

There is a **Vibe Coding DACH** community on Skool with workflow reviews, premium templates, and live calls. AIVC DACH is the open-source tool – Vibe Coding DACH is the community around it.

👉 [Vibe Coding DACH on Skool](https://www.skool.com/[SKOOL-LINK])

---

## 🛠️ Requirements

The installer checks everything automatically and tells you what to install:

| Tool | What it's used for | Required? |
|---|---|---|
| Claude Code | The skill integration & "one prompt" workflow | ✅ |
| Node.js (≥ 18) | The local renderer | ✅ |
| Git | Cloning the repo + updates | ✅ |
| ffmpeg | Encoding frames into an MP4 | ✅ (auto-fallback to `ffmpeg-static` if missing) |
| Puppeteer + Chromium | Headless browser for frame capture | auto-installed via `npm install` (~150 MB once) |
| Python 3.11+ | Faster Whisper (subtitle features, planned for v2.1) | optional |
| Faster Whisper | Subtitles from audio (planned) | optional |

**Supported systems:** Windows 10/11, macOS, Linux.

---

## 🩺 Troubleshooting

Got problems? See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for common fixes
(Chromium download fails, ffmpeg missing, permission errors, render produces black video, …).

---

## 📄 License

MIT – do whatever you want. If the tool helps you, a ⭐ on GitHub is appreciated.

---

## 🤝 Credits

- **Inspired by** [Hyperframes](https://hyperframes.heygen.com) (HeyGen) – the idea of rendering videos from declarative templates. AIVC DACH is **not** a Hyperframes client; it's a standalone local renderer with a similar philosophy.
- Inspired by the [RoboNuggets Helper](https://github.com/robonuggets/hyperframes-helper)
- Renderer built on [Puppeteer](https://pptr.dev/) and [ffmpeg](https://ffmpeg.org/)
- Owned and maintained by **ZELDOgiq & Media AI AT**
- Community: **Vibe Coding DACH** ❤️
