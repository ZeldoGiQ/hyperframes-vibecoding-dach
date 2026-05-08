#!/bin/bash
# Reset script for AIVC DACH

set -e

CONFIG_DIR="$HOME/.aivc-dach"

echo ""
echo "🔄 AIVC DACH Reset"
echo ""
echo "The following will be deleted:"
echo "  - Brand config ($CONFIG_DIR/brand.config.json)"
echo "  - Cache and temporary files"
echo ""
echo "Will NOT be deleted:"
echo "  - Renderer install (renderer/node_modules/)"
echo "  - Your logos in $CONFIG_DIR/assets/"
echo "  - Rendered videos in output/"
echo "  - Legacy config in ~/.hyperframes-vbc/ (left untouched)"
echo ""
read -p "Really reset? (y/N): " confirm

case "$confirm" in
    [Yy]|[Yy][Ee][Ss]) ;;
    *) echo "❌ Reset cancelled."; exit 0 ;;
esac

# Backup brand config (just in case)
if [ -f "$CONFIG_DIR/brand.config.json" ]; then
    cp "$CONFIG_DIR/brand.config.json" "$CONFIG_DIR/brand.config.backup.json"
    echo "✅ Backup saved to brand.config.backup.json"
fi

# Delete config (but not assets)
rm -f "$CONFIG_DIR/brand.config.json"

# Clear cache
rm -rf "$CONFIG_DIR/cache"

echo ""
echo "✅ Reset complete!"
echo ""
echo "Set up again by telling Claude Code:"
echo "  \"Set up brand\""
echo ""
