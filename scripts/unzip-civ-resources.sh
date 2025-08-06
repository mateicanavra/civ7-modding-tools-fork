#!/usr/bin/env bash
set -euo pipefail

# unzip-civ-resources.sh — Unpack a slimmed Civ7 Resources zip.
#
# Usage: unzip-civ-resources.sh [ZIPFILE] [DEST_DIR]
# ZIPFILE:  path to civ7-official-resources.zip (defaults to civ7-official-resources.zip in cwd)
# DEST_DIR: directory to unpack into (defaults to cwd; a subfolder civ7-official-resources will be created)

ZIP_FILE=${1:-civ7-official-resources.zip}
if [[ ! -f "$ZIP_FILE" ]]; then
  echo "❌ Zip file not found: $ZIP_FILE" >&2
  exit 1
fi

DEST_DIR=${2:-$(pwd)}
if [[ ! -d "$DEST_DIR" ]]; then
  echo "❌ Destination directory does not exist: $DEST_DIR" >&2
  exit 1
fi

echo "🔍 Unpacking '$ZIP_FILE' to '$DEST_DIR/civ7-official-resources'..."
TARGET_DIR="$DEST_DIR/civ7-official-resources"
mkdir -p "$TARGET_DIR"
if command -v unzip >/dev/null 2>&1; then
  unzip -qq "$ZIP_FILE" -d "$TARGET_DIR"
elif command -v bsdtar >/dev/null 2>&1; then
  bsdtar -xf "$ZIP_FILE" -C "$TARGET_DIR"
else
  echo "❌ Neither 'unzip' nor 'bsdtar' is available to extract archives." >&2
  exit 1
fi

echo "✅ Done. Resources unpacked to $TARGET_DIR"