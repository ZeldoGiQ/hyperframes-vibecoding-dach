#!/usr/bin/env python3
"""
Smoke test for AIVC DACH

Checks:
- All templates have template.html and meta.json
- All JSON files are valid
- Variables declared in meta.json appear in template.html
- Render-test (string substitution only) works
- Renderer files exist + `node render.js --help` runs

Run: python3 scripts/smoke-test.py
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Layout in v3.0.0+:
#   <repo>/generator/scripts/smoke-test.py  (this file)
#   <repo>/generator/templates/...
#   <repo>/generator/renderer/
#   <repo>/shared/brand.config.example.json
GENERATOR_ROOT = Path(__file__).parent.parent
REPO_ROOT = GENERATOR_ROOT.parent
TEMPLATES_DIR = GENERATOR_ROOT / "templates"
TEMPLATES_INDEX = GENERATOR_ROOT / "templates.json"
RENDERER_DIR = GENERATOR_ROOT / "renderer"
SHARED_DIR = REPO_ROOT / "shared"
# Keep `ROOT` as alias so the rest of the script (template paths) stays unchanged.
ROOT = GENERATOR_ROOT

# Colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

errors = 0
warnings = 0

def ok(msg):
    print(f"{GREEN}[OK]{NC} {msg}")

def err(msg):
    global errors
    errors += 1
    print(f"{RED}[FAIL]{NC} {msg}")

def warn(msg):
    global warnings
    warnings += 1
    print(f"{YELLOW}[WARN]{NC} {msg}")

def info(msg):
    print(f"{BLUE}[INFO]{NC} {msg}")

def section(title):
    print(f"\n{BLUE}--- {title} ---{NC}")

# 1. templates.json
section("1. Templates index")
try:
    with open(TEMPLATES_INDEX, encoding="utf-8") as f:
        index = json.load(f)
    ok(f"templates.json valid ({len(index['templates'])} templates)")
except Exception as e:
    err(f"templates.json broken: {e}")
    sys.exit(1)

# 2. Each template
section("2. Per-template checks")

for tpl in index["templates"]:
    tpl_id = tpl["id"]
    tpl_dir = ROOT / tpl["path"]

    info(f"Checking: {tpl['name']}")

    if not tpl_dir.exists():
        err(f"  Directory missing: {tpl_dir}")
        continue

    template_html = tpl_dir / "template.html"
    meta_json = tpl_dir / "meta.json"

    if not template_html.exists():
        err(f"  template.html missing in {tpl_id}")
        continue
    if not meta_json.exists():
        err(f"  meta.json missing in {tpl_id}")
        continue

    try:
        with open(meta_json, encoding="utf-8") as f:
            meta = json.load(f)
    except Exception as e:
        err(f"  meta.json broken: {e}")
        continue

    with open(template_html, encoding="utf-8") as f:
        html = f.read()

    # Required CSS variables
    required_css_vars = ["{{PRIMARY_COLOR}}", "{{ACCENT_COLOR}}", "{{BACKGROUND_COLOR}}", "{{TEXT_COLOR}}", "{{FONT_HEADING}}"]
    for var in required_css_vars:
        if var not in html:
            warn(f"  CSS variable {var} not in template")

    # Helper script + auto-fit must be present (added in v2.0.0)
    if "__seekToTime" not in html:
        err(f"  __seekToTime helper missing in {tpl_id}/template.html")
    if "--preview-scale" not in html:
        err(f"  --preview-scale helper missing in {tpl_id}/template.html")
    if "fonts.googleapis.com/css2" not in html:
        warn(f"  Google Fonts <link> missing in {tpl_id}/template.html")

    # Variables declared in meta.json must appear in HTML
    for variable in meta.get("variables", []):
        key = variable["key"]
        placeholder = "{{" + key + "}}"
        if placeholder not in html:
            err(f"  Variable {placeholder} from meta.json missing in template.html")

    # Duration consistency
    if "duration" not in meta:
        err(f"  duration missing in meta.json")
    elif meta["duration"] != tpl["duration"]:
        warn(f"  duration mismatch: meta.json={meta['duration']}, templates.json={tpl['duration']}")

    ok(f"  Template {tpl_id} OK")

# 3. Brand config example
section("3. Brand config example")
try:
    with open(SHARED_DIR / "brand.config.example.json", encoding="utf-8") as f:
        brand = json.load(f)
    required_keys = ["version", "brand", "preferences"]
    for key in required_keys:
        if key not in brand:
            err(f"  Key '{key}' missing in brand.config.example.json")
    if "language" not in brand.get("preferences", {}):
        err("  preferences.language missing in brand.config.example.json")
    ok("brand.config.example.json OK")
except Exception as e:
    err(f"brand.config.example.json broken: {e}")

# 4. Render dry-run (string substitution only)
section("4. String substitution test (news-intro)")
try:
    with open(TEMPLATES_DIR / "news-intro" / "template.html", encoding="utf-8") as f:
        html = f.read()

    rendered = html
    replacements = {
        "{{PRIMARY_COLOR}}": "#0EA5E9",
        "{{ACCENT_COLOR}}": "#F59E0B",
        "{{BACKGROUND_COLOR}}": "#0A0A0A",
        "{{TEXT_COLOR}}": "#FFFFFF",
        "{{FONT_HEADING}}": "Inter",
        "{{BRAND_NAME}}": "Test Brand",
        "{{TOPIC}}": "Smoke test successful",
        "{{SUBTITLE}}": "All good",
    }
    for k, v in replacements.items():
        rendered = rendered.replace(k, v)

    rendered = re.sub(r"\{\{#if LOGO_PATH\}\}.*?\{\{/if\}\}", "", rendered)

    output = ROOT / "examples" / "render-test.html"
    output.parent.mkdir(exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        f.write(rendered)

    ok(f"Render test successful ({len(rendered)} chars)")
    info(f"Test output: {output}")
except Exception as e:
    err(f"Render test failed: {e}")

# 5. Renderer
section("5. Renderer")

renderer_pkg = RENDERER_DIR / "package.json"
renderer_js = RENDERER_DIR / "render.js"
renderer_modules = RENDERER_DIR / "node_modules"

if not renderer_pkg.exists():
    err(f"renderer/package.json missing: {renderer_pkg}")
else:
    try:
        with open(renderer_pkg, encoding="utf-8") as f:
            pkg = json.load(f)
        if pkg.get("name") != "aivc-dach-renderer":
            err(f"renderer/package.json name should be 'aivc-dach-renderer', got '{pkg.get('name')}'")
        else:
            ok("renderer/package.json OK")
    except Exception as e:
        err(f"renderer/package.json broken: {e}")

if not renderer_js.exists():
    err(f"renderer/render.js missing: {renderer_js}")
else:
    ok("renderer/render.js found")

if not renderer_modules.exists():
    warn("renderer/node_modules missing – run 'cd renderer && npm install'")
else:
    ok("renderer/node_modules present")
    if renderer_js.exists() and shutil.which("node"):
        try:
            result = subprocess.run(
                ["node", str(renderer_js), "--help"],
                capture_output=True, text=True, timeout=15, cwd=str(RENDERER_DIR)
            )
            if result.returncode == 0 and "AIVC DACH" in (result.stdout + result.stderr):
                ok("renderer --help runs cleanly")
            else:
                warn(f"renderer --help unexpected output (exit {result.returncode})")
        except subprocess.TimeoutExpired:
            warn("renderer --help: timeout (15s)")
        except FileNotFoundError:
            warn("node not in PATH")
        except Exception as e:
            warn(f"renderer --help: {e}")
    else:
        info("Skipping --help dry-run (node not found or render.js missing)")

# Summary
section("Summary")
print(f"  Templates checked: {len(index['templates'])}")
print(f"  Errors:   {RED if errors else GREEN}{errors}{NC}")
print(f"  Warnings: {YELLOW if warnings else GREEN}{warnings}{NC}")
print()

if errors == 0:
    print(f"{GREEN}All tests passed!{NC}")
    sys.exit(0)
else:
    print(f"{RED}{errors} error(s) found. Please fix before committing.{NC}")
    sys.exit(1)
