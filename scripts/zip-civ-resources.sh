#!/usr/bin/env bash
set -euo pipefail

# zip-civ-resources.sh — Zip up a “media-pruned” Civ7 Resources tree (macOS Steam).
#
# Auto-locates the Resources folder under the standard Steam path:
#   ~/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/
#   CivilizationVII.app/Contents/Resources
#
# Excludes platform binaries, in-game movies, icon packs, fonts, the top-level Assets folder,
# and other large runtime assets.
# Usage: zip-civ-resources.sh [OUTPUT_DIR]
# OUTPUT_DIR: where to write civ7-official-resources.zip (defaults to cwd)

SRC_DIR="$HOME/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/CivilizationVII.app/Contents/Resources"
if [[ ! -d "$SRC_DIR" ]]; then
  echo "❌ Cannot find Civ7 Resources folder at:" >&2
  echo "   $SRC_DIR" >&2
  exit 1
fi

OUTPUT_DIR=${1:-$(pwd)}
if [[ ! -d "$OUTPUT_DIR" ]]; then
  echo "❌ Output directory does not exist: $OUTPUT_DIR" >&2
  exit 1
fi

ZIP_NAME="civ7-official-resources.zip"
ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"

echo "🔍 Zipping slimmed Civ7 Resources to: $ZIP_PATH"
pushd "$SRC_DIR" >/dev/null
zip -r -X "$ZIP_PATH" . \
  -x "*/Platforms/*" \
  -x "*/movies/*" \
  -x "*/data/icons/*" \
  -x "*/Assets/*" \
  -x "*/fonts/*" \
  -x "Assets.car" \
  -x "AppIcon.icns" \
  -x "default.metallib" \
  -x "ShaderAutoGen_*"
popd >/dev/null

echo "✅ Done. Created $ZIP_PATH"
