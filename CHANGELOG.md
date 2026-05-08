# Changelog

All notable changes to AIVC DACH.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
