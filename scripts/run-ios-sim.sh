#!/usr/bin/env bash
# Build the iOS app for the Simulator, install, and launch it.
# Usage: scripts/run-ios-sim.sh ["iPhone 17"]
# NOTE: scheme/Resources names are auto-detected; verify after first gen-xcode.sh run.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJ="$REPO_ROOT/apple/OpenTranslate/OpenTranslate.xcodeproj"
SIM_NAME="${1:-iPhone 17}"
APP_ID="com.mekedron.OpenTranslate"
DD="$REPO_ROOT/apple/DerivedData"
[ -e "$PROJ" ] || { echo "Generate the Xcode project first: scripts/gen-xcode.sh"; exit 1; }

# Pick the iOS app scheme (converter names it like "OpenTranslate (iOS)").
SCHEME="$(xcodebuild -project "$PROJ" -list 2>/dev/null \
  | awk '/Schemes:/{f=1;next} f&&NF{$1=$1;print}' \
  | /usr/bin/grep -iE 'ios' | head -1 || true)"
SCHEME="${SCHEME:-OpenTranslate (iOS)}"
echo "Scheme: '$SCHEME' | Simulator: '$SIM_NAME'"

xcrun simctl boot "$SIM_NAME" 2>/dev/null || true
open -a Simulator || true

xcodebuild -project "$PROJ" -scheme "$SCHEME" -configuration Debug \
  -sdk iphonesimulator -destination "platform=iOS Simulator,name=$SIM_NAME" \
  -derivedDataPath "$DD" CODE_SIGNING_ALLOWED=NO build

APP="$(/usr/bin/find "$DD/Build/Products" -name '*.app' -path '*iphonesimulator*' | head -1 || true)"
[ -n "$APP" ] || { echo "Build product (.app) not found under $DD"; exit 1; }
xcrun simctl install booted "$APP"
xcrun simctl launch booted "$APP_ID" || true
echo "✓ Installed $APP"
echo "  In the Simulator: Settings → Safari → Extensions → enable OpenTranslate → Allow All Websites."
