#!/usr/bin/env bash
# ship.sh — build, zip dist/index.html with a versioned name, open in Finder.
# Usage: npm run ship
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "Building..."
npm run build

# ── Version tag (mirrors vite.config.ts logic) ────────────────────────────────
MAJOR_MINOR=$(node -e "
  const p = require('./package.json');
  const [a, b] = p.version.split('.');
  process.stdout.write('v' + a + '.' + b);
")
PATCH=$(git rev-list --count HEAD 2>/dev/null || echo "0")
HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "")

VERSION="${MAJOR_MINOR}.${PATCH}"
[[ -n "$HASH" ]] && VERSION="${VERSION}-${HASH}"

# ── Zip ───────────────────────────────────────────────────────────────────────
ZIP_NAME="manpower-tracker-${VERSION}.zip"
ZIP_PATH="$ROOT/dist/$ZIP_NAME"

# Remove any previous zip for this version before re-creating it
rm -f "$ZIP_PATH"
(cd "$ROOT/dist" && zip "$ZIP_NAME" index.html)

echo ""
echo "  Built:  dist/index.html"
echo "  Zipped: dist/$ZIP_NAME"
echo ""

# ── Open Finder ───────────────────────────────────────────────────────────────
open "$ROOT/dist"
