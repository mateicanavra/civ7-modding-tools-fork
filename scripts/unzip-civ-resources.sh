#!/usr/bin/env bash
set -euo pipefail

# unzip-civ-resources.sh — Unpack a slimmed Civ7 Resources zip.
#
# Usage: unzip-civ-resources.sh [ZIPFILE]
# ZIPFILE:  path to civ7-official-resources.zip (defaults to civ7-official-resources.zip in cwd)

ZIP_FILE=${1:-civ7-official-resources.zip}
if [[ ! -f "$ZIP_FILE" ]]; then
  echo "❌ Zip file not found: $ZIP_FILE" >&2
  exit 1
fi

DEST_DIR="civ7-official-resources"
echo "🔍 Unpacking '$ZIP_FILE' to '$DEST_DIR'..."
mkdir -p "$DEST_DIR"
if command -v bsdtar >/dev/null 2>&1; then
  bsdtar -xf "$ZIP_FILE" -C "$DEST_DIR" --strip-components=1
elif command -v unzip >/dev/null 2>&1; then
  unzip -qq "$ZIP_FILE" -d "$DEST_DIR"
else
  echo "❌ Neither 'unzip' nor 'bsdtar' is available to extract archives." >&2
  exit 1
fi

echo "✅ Done. Resources unpacked to $DEST_DIR"
