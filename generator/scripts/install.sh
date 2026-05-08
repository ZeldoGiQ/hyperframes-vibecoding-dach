#!/bin/bash

# ============================================================
#   AIVC DACH - Mac/Linux Installer
#   Local renderer (Puppeteer + ffmpeg) - v2.0.0
#   by ZELDOgiq & Media AI AT
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Layout in v3.0.0+:
#   <repo>/generator/scripts/install.sh   (this file)
#   <repo>/generator/renderer/
#   <repo>/shared/brand.config.example.json
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
GENERATOR_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
REPO_ROOT="$( cd "$GENERATOR_ROOT/.." && pwd )"
RENDERER_DIR="$GENERATOR_ROOT/renderer"
SHARED_DIR="$REPO_ROOT/shared"
NEW_CONFIG_DIR="$HOME/.aivc-dach"
LEGACY_CONFIG_DIR="$HOME/.hyperframes-vbc"
ERRORS=0
WARNINGS=0

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   🎬 AIVC DACH                                           ║"
echo "║   Installation starting... (v2.0.0 - local renderer)     ║"
echo "║   by ZELDOgiq & Media AI AT                              ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# --- Step 1: Dependency check ---
echo -e "${BLUE}[1/6] System check...${NC}"
echo ""

check_required() {
    if command -v "$1" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $1 found${NC}"
    else
        echo -e "${RED}❌ $1 missing${NC}"
        echo "   $2"
        ERRORS=$((ERRORS+1))
    fi
}

check_optional() {
    if command -v "$1" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $1 found${NC}"
    else
        echo -e "${YELLOW}⚠️  $1 missing (optional)${NC}"
        echo "   $2"
        WARNINGS=$((WARNINGS+1))
    fi
}

# OS detection
if [[ "$OSTYPE" == "darwin"* ]]; then
    INSTALL_HINT_NODE="brew install node"
    INSTALL_HINT_PYTHON="brew install python@3.11"
    INSTALL_HINT_FFMPEG="brew install ffmpeg"
    INSTALL_HINT_GIT="brew install git"
else
    INSTALL_HINT_NODE="sudo apt install nodejs npm"
    INSTALL_HINT_PYTHON="sudo apt install python3 python3-pip"
    INSTALL_HINT_FFMPEG="sudo apt install ffmpeg"
    INSTALL_HINT_GIT="sudo apt install git"
fi

# Required tools
check_required "node" "Install with: $INSTALL_HINT_NODE"
check_required "git"  "Install with: $INSTALL_HINT_GIT"

# Optional tools – never block install
check_optional "python3" "Only needed for future subtitle features. Install: $INSTALL_HINT_PYTHON"

# ffmpeg detection: PATH first, then common paths, then ffmpeg-static fallback (later via npm)
FFMPEG_FOUND=""
if command -v ffmpeg >/dev/null 2>&1; then
    FFMPEG_FOUND="$(command -v ffmpeg)"
else
    for p in /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg /usr/bin/ffmpeg; do
        if [ -x "$p" ]; then FFMPEG_FOUND="$p"; break; fi
    done
fi

if [ -n "$FFMPEG_FOUND" ]; then
    echo -e "${GREEN}✅ ffmpeg found ($FFMPEG_FOUND)${NC}"
else
    echo -e "${YELLOW}⚠️  ffmpeg missing in PATH (will fall back to bundled ffmpeg-static via npm)${NC}"
    WARNINGS=$((WARNINGS+1))
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ $ERRORS required tool(s) missing. Install them first and re-run.${NC}"
    exit 1
fi
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}ℹ️  $WARNINGS optional tool(s) missing – continuing anyway.${NC}"
fi
echo ""

# --- Step 2: Directories + legacy config migration ---
echo -e "${BLUE}[2/6] Preparing directories...${NC}"
mkdir -p "$NEW_CONFIG_DIR/assets"

# Migrate ~/.hyperframes-vbc -> ~/.aivc-dach (copy, never move)
if [ -f "$LEGACY_CONFIG_DIR/brand.config.json" ] && [ ! -f "$NEW_CONFIG_DIR/brand.config.json" ]; then
    cp "$LEGACY_CONFIG_DIR/brand.config.json" "$NEW_CONFIG_DIR/brand.config.json"
    if [ -d "$LEGACY_CONFIG_DIR/assets" ] && [ ! -d "$NEW_CONFIG_DIR/assets/_legacy" ]; then
        cp -R "$LEGACY_CONFIG_DIR/assets" "$NEW_CONFIG_DIR/assets/_legacy" 2>/dev/null || true
    fi
    echo -e "${GREEN}ℹ️  Migrated config from $LEGACY_CONFIG_DIR to $NEW_CONFIG_DIR – you can delete the old folder when ready.${NC}"
fi

echo -e "${GREEN}✅ Directories ready${NC}"
echo ""

# --- Step 3: Renderer (Puppeteer + ffmpeg-static) ---
echo -e "${BLUE}[3/6] Installing local renderer...${NC}"
echo -e "${YELLOW}    Heads up: on first install Puppeteer downloads ~150 MB of Chromium."
echo -e "    This happens once and takes 1-3 minutes depending on your connection.${NC}"
echo ""

if [ ! -f "$RENDERER_DIR/package.json" ]; then
    echo -e "${RED}❌ renderer/package.json not found at: $RENDERER_DIR${NC}"
    echo "   Are you sure you're inside the aivc-dach repo?"
    exit 1
fi

cd "$RENDERER_DIR"
npm install --no-audit --no-fund
echo -e "${GREEN}✅ Renderer installed${NC}"
echo ""

# --- Step 4: Faster Whisper (optional, for future subtitle features) ---
echo -e "${BLUE}[4/6] Installing Faster Whisper (optional, for future subtitles)...${NC}"
if command -v pip3 >/dev/null 2>&1; then
    if pip3 install faster-whisper --quiet 2>/dev/null; then
        echo -e "${GREEN}✅ Faster Whisper ready${NC}"
    else
        echo -e "${YELLOW}⚠️  faster-whisper skipped (not needed for MVP rendering, install later for subtitle features)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  pip3 not found – skipping faster-whisper. Subtitles are planned for v2.1.${NC}"
fi
echo ""

# --- Step 5: Brand config ---
echo -e "${BLUE}[5/6] Setting up default brand config...${NC}"
if [ ! -f "$NEW_CONFIG_DIR/brand.config.json" ]; then
    cp "$SHARED_DIR/brand.config.example.json" "$NEW_CONFIG_DIR/brand.config.json"
    echo -e "${GREEN}✅ brand.config.json created (defaults from brand.config.example.json)${NC}"
else
    echo -e "${YELLOW}ℹ️  brand.config.json already exists. Skipping.${NC}"
fi
echo ""

# --- Step 6: Smoke test render ---
echo -e "${BLUE}[6/6] Running test render...${NC}"
cd "$GENERATOR_ROOT"
mkdir -p output
TEST_VARS='{"TOPIC":"AIVC DACH installed","SUBTITLE":"Your first test render"}'
if node "$RENDERER_DIR/render.js" --template news-intro --vars "$TEST_VARS" --quiet; then
    LATEST=$(ls -t output/news-intro-*.mp4 2>/dev/null | head -n 1 || true)
    if [ -n "$LATEST" ]; then
        echo -e "${GREEN}✅ Test render successful! Your first real video:${NC}"
        echo "    $LATEST"
        echo ""
        echo -e "${BLUE}    > Tell Claude Code: \"Make a news intro about my first AIVC DACH video\"${NC}"
    else
        echo -e "${YELLOW}⚠️  Render command succeeded but output file not found. Check ./output/ manually.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Test render failed. Templates and config are installed though – see TROUBLESHOOTING.md.${NC}"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   🎉 Installation complete!                              ║"
echo "║                                                          ║"
echo "║   Next: open Claude Code in any folder and try one of:   ║"
echo "║                                                          ║"
echo "║   • \"Make a news intro about [topic]\"                    ║"
echo "║   • \"Set up brand\"   (optional brand wizard)             ║"
echo "║   • \"Show examples\"                                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
