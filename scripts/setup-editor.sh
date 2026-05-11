#!/usr/bin/env bash
# AIVC DACH alpha.2 — editor + overlay engine setup.
# Run from the repo root: ./scripts/setup-editor.sh

set -e

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

cyan() { printf '\033[36m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }

cyan "== AIVC DACH editor setup =="

if ! command -v bun >/dev/null 2>&1; then
  red "bun is not on PATH. Install it from https://bun.sh and re-run this script."
  exit 1
fi
green "bun: $(bun --version)"

if ! command -v node >/dev/null 2>&1; then
  yellow "node is not on PATH. The ffmpeg-static postinstall step (step 3) needs Node."
  yellow "Install Node ≥ 18 from https://nodejs.org and re-run."
  exit 1
fi
green "node: $(node --version)"

cyan "Step 1/5: bun install in editor/"
cd "$REPO_ROOT/editor"
bun install

cyan "Step 2/5: bun install in editor/apps/web/"
cd "$REPO_ROOT/editor/apps/web"
bun install

cyan "Step 3/5: ffmpeg-static postinstall (Bun skips it by default)"
if [ -f node_modules/ffmpeg-static/install.js ]; then
  if [ -f node_modules/ffmpeg-static/ffmpeg ] || [ -f node_modules/ffmpeg-static/ffmpeg.exe ]; then
    green "  ffmpeg binary already present, skipping."
  else
    node node_modules/ffmpeg-static/install.js
    green "  ffmpeg binary downloaded."
  fi
else
  red "  ffmpeg-static not installed under editor/apps/web/. Check step 2."
  exit 1
fi

cyan "Step 4/5: Puppeteer Chrome (~200 MB, one-shot)"
bun x puppeteer browsers install chrome

cyan "Step 5/5: .env.local from .env.example"
if [ -f .env.local ]; then
  yellow "  .env.local exists already, leaving it untouched."
else
  cp .env.example .env.local
  green "  .env.local created — open it and set AIVC_AI_PROVIDER + key + model."
fi

green ""
green "== Setup complete =="
green ""
echo "Next steps:"
echo "  1. Edit editor/apps/web/.env.local — set AIVC_AI_PROVIDER and the matching *_API_KEY + *_MODEL."
echo "     Model docs: see the link in the file for each provider."
echo "  2. From editor/apps/web/ run:  bun run dev"
echo "  3. Open http://localhost:3000 in Chrome."
