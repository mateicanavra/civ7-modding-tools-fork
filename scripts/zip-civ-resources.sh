#!/usr/bin/env bash
set -euo pipefail

# zip-civ-resources.sh — Zip up Civ7 Resources using a profile from civ-zip-config.json.
#
# Auto-locates the Resources folder under the standard Steam path:
#   ~/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/
#   CivilizationVII.app/Contents/Resources
#
# Profiles live in scripts/civ-zip-config.json and define include/exclude rules for zipping.
# Usage: zip-civ-resources.sh [PROFILE] [OUTPUT_DIR]
#   PROFILE:    config profile to apply (default)
#   OUTPUT_DIR: where to write civ7-official-resources.zip (defaults to docs/civ7-official)

SRC_DIR="$HOME/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII/CivilizationVII.app/Contents/Resources"
if [[ ! -d "$SRC_DIR" ]]; then
  echo "❌ Cannot find Civ7 Resources folder at:" >&2
  echo "   $SRC_DIR" >&2
  exit 1
fi

CONFIG_FILE="$(dirname "$0")/civ-zip-config.json"
PROFILE=${1:-default}
OUTPUT_DIR=${2:-docs/civ7-official}
if ! jq -e --arg p "$PROFILE" '.[$p]' "$CONFIG_FILE" >/dev/null; then
  echo "❌ Unknown profile '$PROFILE'" >&2
  exit 1
fi
INCLUDE=($(jq -r --arg p "$PROFILE" '.[$p].zip.include[]?' "$CONFIG_FILE"))
EXCLUDE=($(jq -r --arg p "$PROFILE" '.[$p].zip.exclude[]?' "$CONFIG_FILE"))

mkdir -p "$OUTPUT_DIR"
# Resolve output dir to an absolute path so zip can find it after `pushd`.
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

ZIP_NAME="civ7-official-resources.zip"
ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"

# Ensure any old archive is deleted before creating a new one.
rm -f "$ZIP_PATH"

echo "🔍 Zipping $PROFILE Civ7 Resources to: $ZIP_PATH"
pushd "$SRC_DIR" >/dev/null
ZIP_CMD=(zip -r -X "$ZIP_PATH")
if (( ${#INCLUDE[@]} > 0 )); then
  ZIP_CMD+=("${INCLUDE[@]}")
else
  ZIP_CMD+=(.)
  for pat in "${EXCLUDE[@]}"; do
    ZIP_CMD+=(-x "$pat")
  done
fi
"${ZIP_CMD[@]}"
popd >/dev/null

echo "✅ Done. Created $ZIP_PATH"
