#!/usr/bin/env python3
"""
Smoke-Test für Hyperframes Addon by Vibe Coding DACH

Prüft:
- Alle Templates haben template.html und meta.json
- Alle JSON-Dateien sind valide
- Alle Variablen aus meta.json kommen im template.html vor
- Render-Test mit Beispiel-Daten funktioniert

Aufruf: python3 scripts/smoke-test.py
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
TEMPLATES_DIR = ROOT / "templates"
TEMPLATES_INDEX = ROOT / "templates.json"
RENDERER_DIR = ROOT / "renderer"

# Farben
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

errors = 0
warnings = 0

def ok(msg):
    print(f"{GREEN}✅{NC} {msg}")

def err(msg):
    global errors
    errors += 1
    print(f"{RED}❌{NC} {msg}")

def warn(msg):
    global warnings
    warnings += 1
    print(f"{YELLOW}⚠️ {NC} {msg}")

def info(msg):
    print(f"{BLUE}ℹ️ {NC} {msg}")

def section(title):
    print(f"\n{BLUE}━━━ {title} ━━━{NC}")

# 1. templates.json laden
section("1. Templates-Index prüfen")
try:
    with open(TEMPLATES_INDEX) as f:
        index = json.load(f)
    ok(f"templates.json valide ({len(index['templates'])} Templates)")
except Exception as e:
    err(f"templates.json kaputt: {e}")
    sys.exit(1)

# 2. Jedes Template prüfen
section("2. Templates einzeln prüfen")

for tpl in index["templates"]:
    tpl_id = tpl["id"]
    tpl_dir = ROOT / tpl["path"]
    
    info(f"Prüfe: {tpl['name']}")
    
    if not tpl_dir.exists():
        err(f"  Verzeichnis fehlt: {tpl_dir}")
        continue
    
    template_html = tpl_dir / "template.html"
    meta_json = tpl_dir / "meta.json"
    
    if not template_html.exists():
        err(f"  template.html fehlt in {tpl_id}")
        continue
    if not meta_json.exists():
        err(f"  meta.json fehlt in {tpl_id}")
        continue
    
    # meta.json laden
    try:
        with open(meta_json) as f:
            meta = json.load(f)
    except Exception as e:
        err(f"  meta.json defekt: {e}")
        continue
    
    # Template HTML laden
    with open(template_html) as f:
        html = f.read()
    
    # CSS-Variablen prüfen
    required_css_vars = ["{{PRIMARY_COLOR}}", "{{ACCENT_COLOR}}", "{{BACKGROUND_COLOR}}", "{{TEXT_COLOR}}", "{{FONT_HEADING}}"]
    for var in required_css_vars:
        if var not in html:
            warn(f"  CSS-Variable {var} nicht im Template")
    
    # Variablen aus meta.json müssen im HTML vorkommen
    for variable in meta.get("variables", []):
        key = variable["key"]
        placeholder = "{{" + key + "}}"
        if placeholder not in html:
            err(f"  Variable {placeholder} aus meta.json fehlt im template.html")
    
    # Dauer prüfen
    if "duration" not in meta:
        err(f"  duration fehlt in meta.json")
    elif meta["duration"] != tpl["duration"]:
        warn(f"  duration unterschiedlich: meta.json={meta['duration']}, templates.json={tpl['duration']}")
    
    ok(f"  Template {tpl_id} OK")

# 3. Brand-Config-Beispiel prüfen
section("3. Brand-Config-Beispiel prüfen")
try:
    with open(ROOT / "brand.config.example.json") as f:
        brand = json.load(f)
    required_keys = ["version", "brand", "preferences"]
    for key in required_keys:
        if key not in brand:
            err(f"  Schlüssel '{key}' fehlt in brand.config.example.json")
    ok("brand.config.example.json OK")
except Exception as e:
    err(f"brand.config.example.json defekt: {e}")

# 4. Render-Test mit erstem Template
section("4. Render-Test (News-Intro)")
try:
    with open(TEMPLATES_DIR / "news-intro" / "template.html") as f:
        html = f.read()
    
    # Beispiel-Werte einsetzen
    rendered = html
    replacements = {
        "{{PRIMARY_COLOR}}": "#0EA5E9",
        "{{ACCENT_COLOR}}": "#F59E0B",
        "{{BACKGROUND_COLOR}}": "#0A0A0A",
        "{{TEXT_COLOR}}": "#FFFFFF",
        "{{FONT_HEADING}}": "Inter",
        "{{BRAND_NAME}}": "Test Brand",
        "{{TOPIC}}": "Smoke-Test erfolgreich",
        "{{SUBTITLE}}": "Alles funktioniert",
    }
    for k, v in replacements.items():
        rendered = rendered.replace(k, v)
    
    # Logo-Conditional grob entfernen
    rendered = re.sub(r"\{\{#if LOGO_PATH\}\}.*?\{\{/if\}\}", "", rendered)
    
    # In Test-Output schreiben
    output = ROOT / "examples" / "render-test.html"
    output.parent.mkdir(exist_ok=True)
    with open(output, "w") as f:
        f.write(rendered)
    
    ok(f"Render-Test erfolgreich ({len(rendered)} Zeichen)")
    info(f"Test-Output: {output}")
except Exception as e:
    err(f"Render-Test fehlgeschlagen: {e}")

# 5. Renderer-Test
section("5. Renderer prüfen")

renderer_pkg = RENDERER_DIR / "package.json"
renderer_js = RENDERER_DIR / "render.js"
renderer_modules = RENDERER_DIR / "node_modules"

if not renderer_pkg.exists():
    err(f"renderer/package.json fehlt: {renderer_pkg}")
else:
    ok("renderer/package.json gefunden")

if not renderer_js.exists():
    err(f"renderer/render.js fehlt: {renderer_js}")
else:
    ok("renderer/render.js gefunden")

if not renderer_modules.exists():
    warn("renderer/node_modules fehlt – führe 'cd renderer && npm install' aus, um den Renderer nutzbar zu machen")
else:
    ok("renderer/node_modules vorhanden")
    # Trockenlauf: --help darf nicht crashen
    if renderer_js.exists() and shutil.which("node"):
        try:
            result = subprocess.run(
                ["node", str(renderer_js), "--help"],
                capture_output=True, text=True, timeout=15, cwd=str(RENDERER_DIR)
            )
            if result.returncode == 0 and "Hyperframes" in (result.stdout + result.stderr):
                ok("renderer --help läuft fehlerfrei")
            else:
                warn(f"renderer --help unerwartete Ausgabe (Exit {result.returncode})")
        except subprocess.TimeoutExpired:
            warn("renderer --help: Timeout (15s)")
        except FileNotFoundError:
            warn("node nicht im PATH")
        except Exception as e:
            warn(f"renderer --help: {e}")
    else:
        info("Skippe --help-Trockenlauf (node nicht gefunden oder render.js fehlt)")

# Zusammenfassung
section("Zusammenfassung")
print(f"  Templates geprüft: {len(index['templates'])}")
print(f"  Fehler:    {RED if errors else GREEN}{errors}{NC}")
print(f"  Warnungen: {YELLOW if warnings else GREEN}{warnings}{NC}")
print()

if errors == 0:
    print(f"{GREEN}🎉 Alle Tests bestanden!{NC}")
    sys.exit(0)
else:
    print(f"{RED}❌ {errors} Fehler gefunden. Bitte beheben.{NC}")
    sys.exit(1)
