#!/bin/bash

# fix_links.sh - Utility to rewrite internal Markdown links for docs

# Usage:
#   ./fix_links.sh [docs-root]
#
# Example:
#   ./fix_links.sh docs

set -e

ROOT="${1:-docs}"

echo "Fixing links in docs directory: $ROOT"

find "$ROOT" -type f \( -name "*.md" -o -name "*.markdown" \) | while read -r file; do
    echo "Processing $file"

    # Fix links from e.g.: (guides/database-schemas.md) -> (/guides/database-schemas.md)
    # (docsify prefers leading / to root for internal linking)
    sed -i '' -E 's/\(([.\/]*guides\/[a-zA-Z0-9._/-]+\.md)\)/\(\/guides\/\1\)/g' "$file"
    sed -i '' -E 's/\(([.\/]*reference\/[a-zA-Z0-9._/-]+\.md)\)/\(\/reference\/\1\)/g' "$file"
    sed -i '' -E 's/\(([.\/]*examples\/[a-zA-Z0-9._/-]+\.md)\)/\(\/examples\/\1\)/g' "$file"
    # Fix any accidental doubled slashes (// guides -> /guides)
    sed -i '' -E 's/([^:])\/\/+/\1\//g' "$file"
    # Remove "docs/" prefix if a link has it accidentally (docs/guides/...)
    sed -i '' -E 's/\(docs\//\(\//g' "$file"
done

echo "Internal Markdown links normalized and cleaned."
