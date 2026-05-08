# Renderer

Local video renderer for **AIVC DACH**.

Turns an HTML template (`templates/<name>/template.html`) into a finished MP4 –
no cloud, no account, no API key.

## How does it work?

1. **Load HTML** – the template is filled with your brand values (colors, font, logo) and the variables from your prompt.
2. **Start browser** – Puppeteer opens the HTML file in a headless Chromium at the right resolution (16:9 → 1920×1080, 9:16 → 1080×1920, …).
3. **Frame-by-frame** – all CSS animations are paused. For each frame we set `Animation.currentTime` exactly to the desired time and take a PNG screenshot. Result: deterministic 30 FPS.
4. **Build MP4** – ffmpeg packs the PNGs into an H.264 MP4 with `yuv420p` and `+faststart` (compatible with YouTube, TikTok, Discord, web).

## Why local instead of cloud?

| Local (this) | Cloud API |
|---|---|
| No account needed | Account + API key |
| No render limits | Pay per render / quota |
| Full control over CSS / JS | Fixed schema |
| Works offline | Internet required |
| Data stays on your machine | Uploaded to provider |

## Installation

```bash
cd renderer
npm install
```

On first install Puppeteer downloads its own Chromium (~150 MB, one-shot). After that the renderer works fully offline.

If the Chromium download fails, the renderer falls back to a locally installed Chrome or Edge automatically. See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for details.

## CLI usage

```bash
node render.js --template news-intro --vars '{"TOPIC":"Gemini 4 is here","SUBTITLE":"The new AI model"}'
```

### Options

| Flag | Description |
|---|---|
| `-t, --template <name>` | Required. Template folder under `templates/` |
| `-v, --vars <json>` | JSON string with user variables, e.g. `'{"TOPIC":"…"}'` |
| `-o, --output <path>` | Output file (default: `./output/<template>-<timestamp>.mp4`) |
| `--fps <n>` | Override FPS (default: 30) |
| `--preview` | Generate the HTML file only (no MP4) – fast preview |
| `--keep-frames` | Keep PNG frames (debug) |
| `--quiet` | Less logging |
| `--help` | Show help |

### Environment variables

| Var | Effect |
|---|---|
| `PUPPETEER_EXECUTABLE_PATH` | Force a specific Chrome/Edge/Chromium binary |
| `PUPPETEER_SKIP_DOWNLOAD=1` | Skip Chromium download on `npm install`; renderer auto-detects system browser |

### Examples

```bash
# News intro with topic
node render.js -t news-intro -v '{"TOPIC":"Hello world"}'

# Vertical short to a fixed path
node render.js -t vertical-short -o ./output/tiktok.mp4 \
  -v '{"HOOK":"3 tricks","CONTENT_LINE_1":"More reach","PLATFORM":"TikTok"}'

# Browser preview (no MP4)
node render.js -t news-intro --preview -v '{"TOPIC":"Test"}'
```

## Performance

Rule of thumb on modern hardware (M1/M2, Ryzen 7, …):

- ~30s render time per 10s 16:9 video at 30 FPS
- 9:16 costs about the same (smaller pixel count, same frame count)
- ffmpeg step is usually < 5 % of the total time

The bottleneck is almost always the browser screenshot loop, not the encoding.

## Brand config

The renderer reads `~/.aivc-dach/brand.config.json`. If the file is missing it falls back to
`brand.config.example.json` from the repo and prints a warning.

If a legacy `~/.hyperframes-vbc/brand.config.json` exists (from v1.x), the renderer copies it
to `~/.aivc-dach/` automatically on first run.

Variables expected by the templates:

- `{{BRAND_NAME}}`, `{{PRIMARY_COLOR}}`, `{{ACCENT_COLOR}}`, `{{BACKGROUND_COLOR}}`, `{{TEXT_COLOR}}`
- `{{FONT_HEADING}}`, `{{FONT_BODY}}`, `{{FONT_MONO}}`
- `{{LOGO_PATH}}`, `{{LOGO_POSITION}}`, `{{LANGUAGE}}`
- Plus all user variables from `--vars`

Conditionals are supported:

```html
{{#if LOGO_PATH}}<img src="{{LOGO_PATH}}">{{/if}}
```

## ffmpeg

The renderer uses **`ffmpeg-static`** (preinstalled via npm) and falls back to system `ffmpeg`
if the module is unavailable. You don't need to configure anything manually.

## Known limitations

- **No audio track** – the templates are pure visuals. Sound/TTS can be added as a post-step later (planned for v2.1).
- **Web fonts without internet** – if the template loads Google Fonts via `<link>`, you need internet on first render. Locally installed fonts (e.g. Inter from your system) work offline.
- **JavaScript inside the template runs** – use with care. Template animations should be CSS first.
