# 🩺 Troubleshooting

A short list of the most common issues plus exact fixes. If your problem isn't here, [open an issue](https://github.com/ZeldoGiQ/aivc-dach/issues) or ask the **Vibe Coding DACH** Skool community.

---

## 1. "Chromium download failed" / Puppeteer can't launch

**Symptom:** `npm install` in `renderer/` errors during the Chromium step, or `Error: Could not find Chrome` at render time.

**Fix A – use your local Chrome/Edge.** The renderer auto-detects common paths, but you can also pin one explicitly:

```bash
# macOS / Linux
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
node renderer/render.js --template news-intro --vars '{"TOPIC":"Hi"}'
```

```cmd
:: Windows
set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node renderer\render.js --template news-intro --vars "{\"TOPIC\":\"Hi\"}"
```

**Fix B – skip the Chromium download entirely** (when `npm install`-ing on a slow/locked-down network):

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install --prefix renderer
```

The renderer will then use the system browser it auto-detects.

---

## 2. "ffmpeg not found"

**Symptom:** `Error: spawn ffmpeg ENOENT` at render time.

**Fix:** the renderer falls back to **`ffmpeg-static`** automatically (it's a normal dependency in `renderer/package.json`). Make sure dependencies are installed:

```bash
cd renderer
npm install
```

If you'd rather use a system `ffmpeg`:

- Windows: `winget install Gyan.FFmpeg`
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

---

## 3. "Permission denied on .aivc-dach"

**Symptom:** `EACCES: permission denied, open '/home/you/.aivc-dach/brand.config.json'`.

**Fix:**

```bash
mkdir -p ~/.aivc-dach
chmod -R u+rwX ~/.aivc-dach
```

On macOS, also check that your terminal app has Full Disk Access (System Settings → Privacy & Security).

---

## 4. "Render produces a black video"

Usually a GPU/sandbox issue inside Chromium.

**Fix A:** the renderer already uses `--no-sandbox` and `--disable-dev-shm-usage`. Make sure no system policy disables JS in headless Chrome.

**Fix B:** disable hardware acceleration via env var:

```bash
PUPPETEER_DISABLE_GPU=1 node renderer/render.js --template news-intro --vars '{"TOPIC":"Hi"}'
```

**Fix C:** run `--preview` to inspect the HTML in a real browser. If the preview looks wrong, the bug is in the template, not the renderer.

---

## 5. "Frames are missing or animations look wrong"

**Symptom:** elements jump or stay still in the rendered MP4 even though they animate in the browser preview.

**Cause:** an animation's `delay` or `iterationStart` isn't in sync with the renderer's `__seekToTime` helper.

**Fix:**
1. Open the HTML in `--preview` mode.
2. In the dev tools console: `__seekToTime(2500)` – does the page show what it should at t=2.5 s?
3. If not, the animation uses something the helper doesn't account for (e.g. `playbackRate ≠ 1`). Simplify the keyframes or move logic into a single `@keyframes` rule.

The reference helper lives at the bottom of every `templates/*/template.html`:

```js
window.__seekToTime = function (timeInMs) {
  document.getAnimations().forEach(function (a) {
    try { a.pause(); } catch (_) {}
    try {
      var d = (a.effect && a.effect.getTiming) ? (a.effect.getTiming().delay || 0) : 0;
      a.currentTime = timeInMs - d;
    } catch (_) {}
  });
};
```

---

## 6. "npm install hangs"

**Symptom:** the renderer install sits at "fetching Chromium" forever.

**Checklist:**
1. `ping registry.npmjs.org` works?
2. Behind a corporate proxy? Set `npm config set proxy http://…` and `https-proxy`.
3. Behind a firewall that blocks `storage.googleapis.com`? Use `PUPPETEER_SKIP_DOWNLOAD=1` (see #1) and rely on system Chrome.
4. Slow disk? On Windows, exclude `node_modules` from Defender real-time scanning.

---

## 7. "Cannot find module 'puppeteer'"

**Symptom:** `Error: Cannot find module 'puppeteer'` when running `node renderer/render.js`.

**Fix:** you forgot to install renderer deps:

```bash
cd renderer
npm install
```

If you're running on a fresh clone, the installer (`scripts/install.sh` / `install.bat`) does this automatically.

---

## Still stuck?

- GitHub issues: https://github.com/ZeldoGiQ/aivc-dach/issues
- Vibe Coding DACH community: https://www.skool.com/[SKOOL-LINK]

When opening an issue, please include:
- OS + version
- `node --version`, `npm --version`
- Output of the failing command
- Whether the install was via `scripts/install.*` or via Claude Code
