# Renderer

Lokaler Video-Renderer für das **Hyperframes Addon by Vibe Coding DACH**.

Macht aus einem HTML-Template (`templates/<name>/template.html`) eine fertige MP4 –
ohne Cloud, ohne Account, ohne API-Key.

## Wie funktioniert das?

1. **HTML laden** – das Template wird mit deinen Brand-Werten (Farben, Font, Logo) und den Variablen aus dem User-Prompt gefüllt.
2. **Browser starten** – Puppeteer öffnet die HTML-Datei in einem headless Chromium auf der passenden Auflösung (16:9 = 1920×1080, 9:16 = 1080×1920 …).
3. **Frame-by-Frame** – alle CSS-Animationen werden pausiert. Pro Frame setzen wir `Animation.currentTime` exakt auf die gewünschte Zeit und schießen einen PNG-Screenshot. Das ergibt deterministische 30 FPS.
4. **MP4 bauen** – ffmpeg packt die PNGs zu einer H.264-MP4 mit `yuv420p` und `+faststart` (kompatibel zu YouTube, TikTok, Discord, Web).

## Warum lokal statt Cloud?

| Lokal (das hier) | Cloud-API |
|---|---|
| Kein Account nötig | Account + API-Key |
| Keine Render-Limits | Pro Render zahlen / Quota |
| Volle Kontrolle über CSS / JS | Festes Schema |
| Funktioniert offline | Internet zwingend |
| Daten bleiben auf deinem Rechner | Upload zum Provider |

## Installation

```bash
cd renderer
npm install
```

Beim ersten `npm install` lädt Puppeteer eine eigene Chromium-Version herunter (~150 MB, einmalig). Danach läuft der Renderer komplett offline.

## CLI-Nutzung

```bash
node render.js --template news-intro --vars '{"TOPIC":"Gemini 4 ist da","SUBTITLE":"Das neue KI-Modell"}'
```

### Optionen

| Flag | Beschreibung |
|---|---|
| `-t, --template <name>` | Pflicht. Template-Ordnername unter `templates/` |
| `-v, --vars <json>` | JSON-String mit User-Variablen, z.B. `'{"TOPIC":"…"}'` |
| `-o, --output <path>` | Output-Datei (default: `./output/<template>-<timestamp>.mp4`) |
| `--fps <n>` | FPS überschreiben (default: 30) |
| `--preview` | Nur die HTML-Datei generieren (kein MP4) – schnelle Vorschau |
| `--keep-frames` | PNG-Frames nicht löschen (Debug) |
| `--quiet` | Weniger Logs |
| `--help` | Hilfe anzeigen |

### Beispiele

```bash
# News-Intro mit Topic
node render.js -t news-intro -v '{"TOPIC":"Hallo Welt"}'

# Vertical-Short an einen festen Pfad
node render.js -t vertical-short -o ./output/tiktok.mp4 \
  -v '{"HOOK":"3 Tricks","CONTENT":"Mehr Reichweite","PLATFORM":"TikTok"}'

# Vorschau im Browser (ohne MP4)
node render.js -t news-intro --preview -v '{"TOPIC":"Test"}'
```

## Performance

Faustregel auf moderner Hardware (M1/M2, Ryzen 7, ähnlich):

- ~30 Sek Render-Zeit pro 10 Sek 16:9-Video bei 30 FPS
- 9:16 ist ungefähr gleich teuer (kleinere Pixelmenge, gleiche Frame-Anzahl)
- ffmpeg-Schritt ist meist < 5 % der Gesamtzeit

Engpass ist fast immer der Browser-Screenshot-Loop, nicht das Encoding.

## Brand-Config

Der Renderer liest `~/.hyperframes-vbc/brand.config.json`. Wenn die Datei fehlt, fällt er auf
`brand.config.example.json` aus dem Repo zurück und gibt eine Warnung aus.

Variablen, die im Template erwartet werden:

- `{{BRAND_NAME}}`, `{{PRIMARY_COLOR}}`, `{{ACCENT_COLOR}}`, `{{BACKGROUND_COLOR}}`, `{{TEXT_COLOR}}`
- `{{FONT_HEADING}}`, `{{FONT_BODY}}`, `{{FONT_MONO}}`
- `{{LOGO_PATH}}`, `{{LOGO_POSITION}}`, `{{LANGUAGE}}`
- Plus alle User-Variablen aus `--vars`

Conditionals werden unterstützt:

```html
{{#if LOGO_PATH}}<img src="{{LOGO_PATH}}">{{/if}}
```

## ffmpeg

Der Renderer nutzt **`ffmpeg-static`** (vorinstalliert via npm) und fällt auf System-`ffmpeg`
zurück, falls das Modul nicht da ist. Du brauchst nichts manuell konfigurieren.

## Bekannte Einschränkungen

- **Keine Tonspur** – die Templates sind reine Visuals. Sound/TTS kann später als Post-Step ergänzt werden (geplant für v1.2).
- **Web-Fonts ohne Internet** – wenn das Template Google Fonts via `<link>` lädt, brauchst du Internet beim ersten Render. Lokale Fonts (z.B. Inter aus dem System) gehen offline.
- **JavaScript im Template wird ausgeführt** – nutze das mit Bedacht. Die Template-Animationen sollen primär CSS sein.
