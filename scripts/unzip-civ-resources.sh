#!/usr/bin/env bash
set -euo pipefail

# unzip-civ-resources.sh — Unpack Civ7 Resources using a profile from civ-zip-config.json.
#
# Usage: unzip-civ-resources.sh [PROFILE] [ZIPFILE]
#   PROFILE: profile to apply for inclusion/exclusion (default)
#   ZIPFILE: path to civ7-official-resources.zip (defaults to docs/civ7-official/civ7-official-resources.zip)

CONFIG_FILE="$(dirname "$0")/civ-zip-config.json"
PROFILE=${1:-default}
ZIP_FILE=${2:-docs/civ7-official/civ7-official-resources.zip}
if ! jq -e --arg p "$PROFILE" '.[$p]' "$CONFIG_FILE" >/dev/null; then
  echo "❌ Unknown profile '$PROFILE'" >&2
  exit 1
fi
if [[ ! -f "$ZIP_FILE" ]]; then
  echo "❌ Zip file not found: $ZIP_FILE" >&2
  exit 1
fi

DEST_DIR="civ7-official-resources"
echo "🔍 Unpacking '$ZIP_FILE' to '$DEST_DIR' using profile '$PROFILE'..."
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

INCLUDE=($(jq -r --arg p "$PROFILE" '.[$p].unzip.include[]?' "$CONFIG_FILE"))
EXCLUDE=($(jq -r --arg p "$PROFILE" '.[$p].unzip.exclude[]?' "$CONFIG_FILE"))

if command -v unzip >/dev/null 2>&1; then
  if (( ${#INCLUDE[@]} > 0 )); then
    unzip -qq "$ZIP_FILE" "${INCLUDE[@]}" -d "$DEST_DIR"
  else
    EX_ARGS=()
    for pat in "${EXCLUDE[@]}"; do
      EX_ARGS+=(-x "$pat")
    done
    unzip -qq "$ZIP_FILE" -d "$DEST_DIR" "${EX_ARGS[@]}"
  fi
elif command -v bsdtar >/dev/null 2>&1; then
  if (( ${#INCLUDE[@]} > 0 )); then
    INC_ARGS=()
    for pat in "${INCLUDE[@]}"; do
      INC_ARGS+=(--include "$pat")
    done
    bsdtar -xf "$ZIP_FILE" -C "$DEST_DIR" "${INC_ARGS[@]}"
  else
    EX_ARGS=()
    for pat in "${EXCLUDE[@]}"; do
      EX_ARGS+=(--exclude "$pat")
    done
    bsdtar -xf "$ZIP_FILE" -C "$DEST_DIR" "${EX_ARGS[@]}"
  fi
else
  echo "❌ Neither 'unzip' nor 'bsdtar' is available to extract archives." >&2
  exit 1
fi

echo "✅ Done. Resources unpacked to $DEST_DIR"
