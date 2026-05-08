#!/bin/bash

# ============================================================
#   Hyperframes Addon by Vibe Coding DACH - Mac/Linux Installer
#   Lokaler Renderer (Puppeteer + ffmpeg) – v1.1.0
# ============================================================

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Repo-Root = ein Level über scripts/
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
RENDERER_DIR="$REPO_ROOT/renderer"
CONFIG_DIR="$HOME/.hyperframes-vbc"
ERRORS=0

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   🎬 Hyperframes Addon by Vibe Coding DACH               ║"
echo "║   Installation startet... (v1.1.0 – lokaler Renderer)    ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# --- Schritt 1: Dependency-Check ---
echo -e "${BLUE}[1/5] System-Check läuft...${NC}"
echo ""

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $1 gefunden${NC}"
    else
        echo -e "${RED}❌ $1 fehlt${NC}"
        echo "   $2"
        ERRORS=$((ERRORS+1))
    fi
}

# OS Detection
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
    INSTALL_HINT_NODE="brew install node"
    INSTALL_HINT_PYTHON="brew install python@3.11"
    INSTALL_HINT_FFMPEG="brew install ffmpeg"
    INSTALL_HINT_GIT="brew install git"
else
    OS="linux"
    INSTALL_HINT_NODE="sudo apt install nodejs npm"
    INSTALL_HINT_PYTHON="sudo apt install python3 python3-pip"
    INSTALL_HINT_FFMPEG="sudo apt install ffmpeg"
    INSTALL_HINT_GIT="sudo apt install git"
fi

check_command "node"    "Installiere mit: $INSTALL_HINT_NODE"
check_command "python3" "Installiere mit: $INSTALL_HINT_PYTHON"
check_command "ffmpeg"  "Installiere mit: $INSTALL_HINT_FFMPEG"
check_command "git"     "Installiere mit: $INSTALL_HINT_GIT"

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Es fehlen $ERRORS Tools. Installiere sie zuerst und starte dann neu.${NC}"
    exit 1
fi

# --- Schritt 2: Verzeichnisse ---
echo -e "${BLUE}[2/5] Verzeichnisse werden angelegt...${NC}"
mkdir -p "$CONFIG_DIR/assets"
echo -e "${GREEN}✅ Verzeichnisse bereit${NC}"
echo ""

# --- Schritt 3: Renderer (Puppeteer + ffmpeg-Wrapper) ---
echo -e "${BLUE}[3/5] Lokaler Renderer wird installiert...${NC}"
echo -e "${YELLOW}    Hinweis: Beim ersten Mal lädt Puppeteer ca. 150 MB Chromium herunter."
echo -e "    Das passiert nur einmal und braucht 1–3 Minuten je nach Internet.${NC}"
echo ""

if [ ! -f "$RENDERER_DIR/package.json" ]; then
    echo -e "${RED}❌ renderer/package.json nicht gefunden unter: $RENDERER_DIR${NC}"
    echo "   Bist du sicher, dass du im hyperframes-vibecoding-dach-Repo bist?"
    exit 1
fi

cd "$RENDERER_DIR"
npm install --no-audit --no-fund
echo -e "${GREEN}✅ Renderer installiert${NC}"
echo ""

# --- Schritt 4: Faster Whisper (optional, für spätere Subtitle-Features) ---
echo -e "${BLUE}[4/5] Faster Whisper wird installiert (optional, für Subtitles)...${NC}"
if pip3 install faster-whisper --quiet 2>/dev/null; then
    echo -e "${GREEN}✅ Faster Whisper bereit${NC}"
else
    echo -e "${YELLOW}⚠️  Faster Whisper konnte nicht installiert werden."
    echo -e "    Nicht schlimm – Subtitle-Features sind erst in v1.2 geplant."
    echo -e "    Du kannst es später nachholen mit: pip3 install faster-whisper${NC}"
fi
echo ""

# --- Schritt 5: Brand-Config ---
echo -e "${BLUE}[5/5] Standard-Konfiguration wird erstellt...${NC}"
if [ ! -f "$CONFIG_DIR/brand.config.json" ]; then
    cp "$REPO_ROOT/brand.config.example.json" "$CONFIG_DIR/brand.config.json"
    echo -e "${GREEN}✅ brand.config.json angelegt (Default-Werte aus brand.config.example.json)${NC}"
else
    echo -e "${YELLOW}ℹ️  brand.config.json existiert bereits. Überspringe.${NC}"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   🎉 Installation erfolgreich!                           ║"
echo "║                                                          ║"
echo "║   Nächster Schritt: Sag Claude Code:                     ║"
echo "║   \"Starte den Brand-Wizard\"                              ║"
echo "║                                                          ║"
echo "║   Oder direkt:                                           ║"
echo "║   \"Mach mir ein News-Intro über AI\"                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
