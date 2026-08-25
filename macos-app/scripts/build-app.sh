#!/bin/bash
# Assembles a real, launchable BadgipAdmin.app from the Swift Package build
# output. This exists because SPM executable targets have no native .app
# bundle - Xcode fakes one internally when you hit Run, but this script does
# it explicitly so the app can be built, registered with Launch Services
# (needed for the OAuth URL-scheme callback), and launched entirely from the
# command line. It's also the first half of the eventual .dmg packaging step.
set -euo pipefail

CONFIG="${1:-debug}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/../.build/$CONFIG"
BUNDLE="$SCRIPT_DIR/../build/BadgipAdmin.app"

echo "Building ($CONFIG)"
(cd "$SCRIPT_DIR/.." && swift build -c "$CONFIG")

echo "Assembling $BUNDLE"
rm -rf "$BUNDLE"
mkdir -p "$BUNDLE/Contents/MacOS" "$BUNDLE/Contents/Resources"

cp "$APP_DIR/BadgipAdmin" "$BUNDLE/Contents/MacOS/BadgipAdmin"
cp "$SCRIPT_DIR/../Sources/BadgipAdmin/Info.plist" "$BUNDLE/Contents/Info.plist"

# Copy the SPM-generated resource bundle (holds GoogleService-Info.plist).
RESOURCE_BUNDLE=$(find "$APP_DIR" -maxdepth 1 -name "*.bundle" -print -quit || true)
if [ -n "$RESOURCE_BUNDLE" ]; then
  cp -R "$RESOURCE_BUNDLE" "$BUNDLE/Contents/Resources/"
fi

echo "Ad-hoc signing"
codesign --force --deep --sign - "$BUNDLE"

echo "Registering with Launch Services"
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f "$BUNDLE"

echo "Done: $BUNDLE"
