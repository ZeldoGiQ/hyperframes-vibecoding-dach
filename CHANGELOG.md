# Changelog

Alle nennenswerten Änderungen am Hyperframes Addon by Vibe Coding DACH.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## v1.1.0 – 2026-05-08

### Geändert
- **Eigenständiger lokaler Renderer** statt Abhängigkeit zu HeyGen Hyperframes.
- Render-Pipeline: HTML-Template + CSS-Animation → Puppeteer (Frame-by-Frame) → ffmpeg → MP4.
- `scripts/install.sh` und `scripts/install.bat` komplett überarbeitet (5 Schritte statt 6, ohne `git clone heygen/hyperframes`).
- `SKILL.md` aktualisiert: Renderer-Schritt ersetzt Hyperframes-Schritt; "Render-Vorschau"-Befehl ergänzt; "Studio öffnen" entfernt.
- README + INSTALL: Voraussetzungen-Tabellen, Speicherorte und Credits angepasst (HeyGen ist jetzt "inspiriert von", nicht "basiert auf").

### Hinzugefügt
- `renderer/` mit `package.json`, `render.js`, `README.md`.
- CLI: `--template`, `--vars`, `--output`, `--fps`, `--preview`, `--keep-frames`, `--quiet`, `--help`.
- Auflösungs-Mapping: 16:9 → 1920×1080, 9:16 → 1080×1920, 1:1 → 1080×1080, 4:5 → 1080×1350, 4:3 → 1440×1080.
- Conditional-Blöcke `{{#if VAR}}…{{/if}}` im Template-System.
- Fallback auf `brand.config.example.json`, falls `~/.hyperframes-vbc/brand.config.json` fehlt.
- `ffmpeg-static` als Fallback, falls kein System-`ffmpeg` im PATH ist.
- Smoke-Test um Sektion 5 (Renderer-Check) erweitert.
- `CHANGELOG.md`.

### Korrigiert
- Installation funktioniert jetzt out-of-the-box. `heygen/hyperframes` existiert nicht als Open-Source-Repo (Cloud-Produkt unter `hyperframes.heygen.com`) – das alte Setup hätte mit HTTP 404 abgebrochen.

## v1.0.0 – 2026-05-07

- Erstes öffentliches Release (deprecated wegen falscher Hyperframes-Annahme).
- 6 Format-Templates, Brand-Wizard, One-Command-Installer, SKILL.md, Smoke-Test.
