#!/usr/bin/env bash
# ONE-TIME generation of the Xcode project from the built Safari web extension.
# After running this once and committing apple/, do NOT run it again with --force.
# - Everyday rebuilds:        scripts/sync-resources.sh
# - Structural manifest change: xcrun safari-web-extension-converter --rebuild-project apple/OpenTranslate ...
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/extension/.output/safari-mv3"
[ -d "$SRC" ] || { echo "Build first: scripts/build-safari.sh"; exit 1; }
if [ -e "$REPO_ROOT/apple/OpenTranslate" ]; then
  echo "apple/OpenTranslate already exists — refusing to regenerate (would clobber hand edits)."
  echo "Use scripts/sync-resources.sh, or rerun the converter with --rebuild-project manually."
  exit 1
fi
mkdir -p "$REPO_ROOT/apple"
xcrun safari-web-extension-converter \
  --project-location "$REPO_ROOT/apple" \
  --app-name OpenTranslate \
  --bundle-identifier com.mekedron.OpenTranslate \
  --swift --copy-resources --no-open --no-prompt --force \
  "$SRC"
echo "✓ Generated → $REPO_ROOT/apple/OpenTranslate (commit it, then never --force again)"
